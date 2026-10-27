import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { getPlayer, listPlayers } from "@/server/players";
import {
  approveRegistration,
  getRegistrationLink,
  listRegistrations,
  pendingRegistrationCount,
  publicRegistrationAcademy,
  rejectRegistration,
  submitPublicRegistration,
  updateRegistrationLink,
} from "@/server/registrations";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const form = (over: Partial<Parameters<typeof submitPublicRegistration>[1]> = {}) => ({
  fullName: "Raka Pratama",
  birthDate: "2015-03-14",
  guardianName: "Ibu Sari",
  guardianPhone: "0812 3456 7890",
  consent: true as const,
  ...over,
});

async function openLink(a: Awaited<ReturnType<typeof academyOf>>) {
  return (await updateRegistrationLink(a.ctx, {})).token;
}

describe("pendaftaran lewat link publik", () => {
  it("halaman publik hanya mengenali token yang aktif", async () => {
    const a = await academyOf("Garuda Muda");
    expect(await getRegistrationLink(a.ctx)).toBeNull();
    const token = await openLink(a);
    expect(await publicRegistrationAcademy(token)).toBe("Garuda Muda");
    expect(await publicRegistrationAcademy("token-yang-salah-sekali-123")).toBeNull();
    expect(await publicRegistrationAcademy("pendek")).toBeNull();
    await updateRegistrationLink(a.ctx, { enabled: false });
    expect(await publicRegistrationAcademy(token)).toBeNull();
    await expect(submitPublicRegistration(token, form())).rejects.toMatchObject({ status: 404, code: "closed" });
  });

  it("mengganti token mematikan link lama", async () => {
    const a = await academyOf("Garuda");
    const old = await openLink(a);
    const fresh = (await updateRegistrationLink(a.ctx, { rotate: true })).token;
    expect(fresh).not.toBe(old);
    expect(await publicRegistrationAcademy(old)).toBeNull();
    expect(await publicRegistrationAcademy(fresh)).toBe("Garuda");
  });

  it("pendaftar masuk antrean, pendaftar kembar tidak ganda, admin melihat kontak wali", async () => {
    const a = await academyOf("Garuda");
    const token = await openLink(a);
    await submitPublicRegistration(token, form());
    await submitPublicRegistration(token, form({ fullName: "raka pratama" })); // sama, hanya beda huruf
    await submitPublicRegistration(token, form({ fullName: "Bima Saputra", note: "Pernah main di SSB lain" }));
    const list = await listRegistrations(a.ctx);
    expect(list.map((r) => r.fullName).sort()).toEqual(["Bima Saputra", "Raka Pratama"]);
    expect(list.find((r) => r.fullName === "Raka Pratama")).toMatchObject({ guardianName: "Ibu Sari", guardianPhone: "0812 3456 7890" });
    expect(await pendingRegistrationCount(a.ctx)).toBe(2);
  });

  it("menyetujui membuat pemain lengkap dengan kontak wali, sekali saja", async () => {
    const a = await academyOf("Garuda");
    const team = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const token = await openLink(a);
    await submitPublicRegistration(token, form());
    const [reg] = await listRegistrations(a.ctx);
    const playerId = await approveRegistration(a.ctx, reg!.id, { teamIds: [team] });
    const p = await getPlayer(a.ctx, playerId);
    expect(p).toMatchObject({ fullName: "Raka Pratama", birthDate: "2015-03-14" });
    expect(p.guardian).toEqual({ name: "Ibu Sari", phone: "0812 3456 7890" });
    expect(p.teams.map((t) => t.id)).toEqual([team]);
    expect(await listRegistrations(a.ctx)).toHaveLength(0);
    await expect(approveRegistration(a.ctx, reg!.id, { teamIds: [team] })).rejects.toMatchObject({ status: 404 });
    expect(await listPlayers(a.ctx)).toHaveLength(1);
  });

  it("persetujuan yang gagal tidak membuat pemain setengah jadi", async () => {
    const a = await academyOf("Garuda");
    const token = await openLink(a);
    await submitPublicRegistration(token, form());
    const [reg] = await listRegistrations(a.ctx);
    await expect(
      approveRegistration(a.ctx, reg!.id, { teamIds: ["00000000-0000-4000-8000-000000000000"] }),
    ).rejects.toMatchObject({ status: 422 });
    expect(await listPlayers(a.ctx)).toHaveLength(0);
    expect(await listRegistrations(a.ctx)).toHaveLength(1); // tetap menunggu
  });

  it("menolak pendaftar mengeluarkannya dari antrean", async () => {
    const a = await academyOf("Garuda");
    const token = await openLink(a);
    await submitPublicRegistration(token, form());
    const [reg] = await listRegistrations(a.ctx);
    await rejectRegistration(a.ctx, reg!.id, { reason: "Kuota penuh" });
    expect(await listRegistrations(a.ctx)).toHaveLength(0);
    // Setelah ditolak, orang yang sama boleh mendaftar lagi.
    await submitPublicRegistration(token, form());
    expect(await listRegistrations(a.ctx)).toHaveLength(1);
  });

  it("izin: pelatih dan bendahara tidak mengelola pendaftaran", async () => {
    const a = await academyOf("Garuda");
    const token = await openLink(a);
    await submitPublicRegistration(token, form());
    const coach = await staffOf(a, ["coach"], "Pelatih");
    const treasurer = await staffOf(a, ["treasurer"], "Bendahara");
    for (const who of [coach, treasurer]) {
      await expect(getRegistrationLink(who)).rejects.toMatchObject({ status: 403 });
      await expect(listRegistrations(who)).rejects.toMatchObject({ status: 403 });
      await expect(updateRegistrationLink(who, { rotate: true })).rejects.toMatchObject({ status: 403 });
    }
    expect(await pendingRegistrationCount(coach)).toBe(0);
  });

  it("isolasi: antrean dan link satu akademi tidak terlihat akademi lain", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    const token = await openLink(a);
    await submitPublicRegistration(token, form());
    const [reg] = await listRegistrations(a.ctx);
    expect(await listRegistrations(b.ctx)).toHaveLength(0);
    expect(await getRegistrationLink(b.ctx)).toBeNull();
    await expect(rejectRegistration(b.ctx, reg!.id, {})).rejects.toMatchObject({ status: 404 });
    // Token akademi A tidak pernah mengisi antrean B.
    expect(await publicRegistrationAcademy(token)).toBe("Garuda");
  });

  it("antrean menunggu dibatasi 200 supaya tidak bisa dibanjiri", async () => {
    const a = await academyOf("Garuda");
    const token = await openLink(a);
    await withContext(db(), { businessId: a.id }, (tx) =>
      tx.execute(sqlFill(a.id)),
    );
    await expect(submitPublicRegistration(token, form({ fullName: "Anak Terakhir" }))).rejects.toMatchObject({ status: 429, code: "full" });
  });
});

const sqlFill = (businessId: string) => sql`
  INSERT INTO bola.registrations (business_id, full_name, birth_date, guardian_name, guardian_phone, consent_at)
  SELECT ${businessId}::uuid, 'Anak ' || g, DATE '2015-01-01', 'Wali', '081234567890', now() FROM generate_series(1, 200) g`;
