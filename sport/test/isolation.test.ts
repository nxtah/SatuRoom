import { withContext } from "@saturoom/core/db";
import { auditEvents, businesses, memberships } from "@saturoom/core/schema";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createAcademy, getAcademy, listMyAcademies, switchAcademy, updateAcademy } from "@/server/academy";
import { loadAcademyContext } from "@/server/context";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { locations, staffRoles } from "@/server/schema";
import { refresh, userWithSession } from "./helpers";

async function academyOf(name: string) {
  const owner = await userWithSession(`Pemilik ${name}`);
  const id = await createAcademy(owner, { name, city: "Bandung" });
  const session = await refresh(owner);
  return { id, session, ctx: await loadAcademyContext(session) };
}

describe("isolasi antar-akademi", () => {
  it("membuat akademi memberi peran Pemilik, satu lokasi utama, dan catatan audit", async () => {
    const a = await academyOf("Garuda");
    expect(a.ctx.roles).toEqual(["owner"]);
    expect(a.ctx.can("academy.update")).toBe(true);
    const rows = await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, async (tx) => ({
      locs: await tx.select().from(locations),
      audit: await tx.select().from(auditEvents),
    }));
    expect(rows.locs).toHaveLength(1);
    expect(rows.locs[0]!.isPrimary).toBe(true);
    expect(rows.audit.map((r) => r.action)).toContain("academy.created");
  });

  it("akademi lain tidak terbaca walau id-nya diketahui", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    const seen = await withContext(db(), { userId: b.ctx.userId, businessId: b.id }, async (tx) => ({
      biz: await tx.select().from(businesses).where(eq(businesses.id, a.id)),
      locs: await tx.select().from(locations).where(eq(locations.businessId, a.id)),
      roles: await tx.select().from(staffRoles).where(eq(staffRoles.businessId, a.id)),
      members: await tx.select().from(memberships).where(eq(memberships.businessId, a.id)),
    }));
    expect(seen).toEqual({ biz: [], locs: [], roles: [], members: [] });
    expect((await listMyAcademies(b.ctx.userId)).map((x) => x.id)).toEqual([b.id]);
  });

  it("tidak bisa menulis ke akademi lain dari konteks akademi sendiri", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    await expect(
      withContext(db(), { userId: b.ctx.userId, businessId: b.id }, (tx) =>
        tx.insert(locations).values({ businessId: a.id, branchId: crypto.randomUUID(), name: "Susupan" }),
      ),
    ).rejects.toThrow();
    // Update ke baris akademi lain tidak mengenai apa pun.
    const changed = await withContext(db(), { userId: b.ctx.userId, businessId: b.id }, (tx) =>
      tx.update(businesses).set({ name: "Dibajak" }).where(eq(businesses.id, a.id)).returning(),
    );
    expect(changed).toEqual([]);
    expect((await getAcademy(a.ctx)).name).toBe("Garuda");
  });

  it("id akademi di sesi bukan bukti akses: bukan anggota berarti ditolak", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    await expect(switchAcademy(b.session, a.id)).rejects.toMatchObject({ status: 404 });
    // Sesi yang dipaksa menunjuk akademi lain tetap tidak mendapat konteks.
    await expect(loadAcademyContext({ ...b.session, activeBusinessId: a.id })).rejects.toMatchObject({
      code: "no_academy",
    });
  });

  it("tanpa konteks akademi, data milik akademi tidak terlihat sama sekali", async () => {
    await academyOf("Garuda");
    const count = await withContext(db(), {}, (tx) =>
      tx.select({ n: sql<number>`count(*)::int` }).from(locations),
    );
    expect(count[0]!.n).toBe(0);
  });
});

describe("izin per peran", () => {
  it("pelatih bisa membuka akademi tetapi tidak bisa mengubah profilnya", async () => {
    const a = await academyOf("Garuda");
    const coach = await userWithSession("Coach Tomi");
    await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, async (tx) => {
      const [m] = await tx.insert(memberships).values({ businessId: a.id, userId: coach.userId }).returning();
      await tx.insert(staffRoles).values({ businessId: a.id, membershipId: m!.id, role: "coach" });
    });
    await switchAcademy(coach, a.id);
    const ctx = await loadAcademyContext(await refresh(coach));
    expect(ctx.roles).toEqual(["coach"]);
    expect(ctx.can("academy.update")).toBe(false);
    await expect(updateAcademy(ctx, { name: "Diubah pelatih", city: "X" })).rejects.toBeInstanceOf(AppError);
    expect((await getAcademy(a.ctx)).name).toBe("Garuda");
  });

  it("anggota yang dinonaktifkan langsung kehilangan akses", async () => {
    const a = await academyOf("Garuda");
    const staff = await userWithSession("Admin Rina");
    const membershipId = await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, async (tx) => {
      const [m] = await tx.insert(memberships).values({ businessId: a.id, userId: staff.userId }).returning();
      await tx.insert(staffRoles).values({ businessId: a.id, membershipId: m!.id, role: "admin" });
      return m!.id;
    });
    await switchAcademy(staff, a.id);
    const session = await refresh(staff);
    await loadAcademyContext(session);
    await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.update(memberships).set({ status: "suspended" }).where(eq(memberships.id, membershipId)),
    );
    await expect(loadAcademyContext(session)).rejects.toMatchObject({ code: "no_academy" });
  });
});
