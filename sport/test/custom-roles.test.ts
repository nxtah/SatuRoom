import { describe, expect, it } from "vitest";
import { loadAcademyContext } from "@/server/context";
import { archiveCustomRole, createCustomRole, listCustomRoles, updateCustomRole } from "@/server/roles";
import { acceptInvitation, inviteStaff, listStaff, myInvitations, updateStaff } from "@/server/staff";
import { academyOf, refresh, staffOf, userWithSession } from "./helpers";

describe("peran buatan pemilik", () => {
  it("staf dengan peran custom mendapat izinnya; diarsipkan berarti izin hilang", async () => {
    const a = await academyOf("Garuda Peran");
    const roleId = await createCustomRole(a.ctx, { name: "Kasir iuran", permissions: ["billing.read", "billing.manage"] });
    expect((await listCustomRoles(a.ctx))[0]).toMatchObject({ name: "Kasir iuran", permissions: ["billing.read", "billing.manage"] });

    const u = await userWithSession("Kasir Rani");
    await inviteStaff(a.ctx, { email: u.email, customRoleIds: [roleId] });
    const [inv] = await myInvitations(u.userId);
    await acceptInvitation(u, inv!.id);
    let ctx = await loadAcademyContext(await refresh(u));
    expect(ctx.roles).toEqual([]);
    expect(ctx.customRoleNames).toEqual(["Kasir iuran"]);
    expect(ctx.can("billing.manage")).toBe(true);
    expect(ctx.can("staff.manage")).toBe(false);

    const member = (await listStaff(a.ctx)).members.find((m) => m.userId === u.userId)!;
    expect(member.customRoles.map((c) => c.name)).toEqual(["Kasir iuran"]);

    await updateCustomRole(a.ctx, roleId, { name: "Kasir iuran", permissions: ["billing.read"] });
    ctx = await loadAcademyContext(await refresh(u));
    expect(ctx.can("billing.manage")).toBe(false);

    await archiveCustomRole(a.ctx, roleId);
    ctx = await loadAcademyContext(await refresh(u));
    expect(ctx.can("billing.read")).toBe(false);
  });

  it("tidak bisa memberi izin yang tidak dimiliki, nama ganda ditolak, dan peran akademi lain tidak terlihat", async () => {
    const a = await academyOf("Garuda Eskalasi");
    const b = await academyOf("Elang Eskalasi");
    const admin = await staffOf(a, ["admin"], "Admin A");

    // Admin tidak punya roles.manage.
    await expect(createCustomRole(admin, { name: "Apa saja", permissions: ["billing.read"] })).rejects.toMatchObject({ status: 403 });

    const big = await createCustomRole(a.ctx, { name: "Super", permissions: ["academy.update", "roles.manage"] });
    await expect(createCustomRole(a.ctx, { name: "super ", permissions: ["billing.read"] })).rejects.toMatchObject({ status: 409 });

    // Admin punya staff.manage tapi tidak punya academy.update: tidak boleh memasang peran Super.
    const u = await userWithSession("Calon");
    await expect(inviteStaff(admin, { email: u.email, customRoleIds: [big] })).rejects.toMatchObject({ status: 403 });

    // Peran akademi A tidak bisa dipakai di akademi B.
    expect(await listCustomRoles(b.ctx)).toEqual([]);
    await expect(inviteStaff(b.ctx, { email: u.email, customRoleIds: [big] })).rejects.toMatchObject({ status: 422 });
    await expect(archiveCustomRole(b.ctx, big)).rejects.toMatchObject({ status: 404 });

    // Undangan wajib berisi minimal satu peran.
    await expect(inviteStaff(a.ctx, { email: u.email })).rejects.toMatchObject({ status: 422 });
  });

  it("peran bawaan bisa diganti peran custom saja lewat ubah staf", async () => {
    const a = await academyOf("Garuda Ubah");
    const coach = await staffOf(a, ["coach"], "Coach Budi");
    const roleId = await createCustomRole(a.ctx, { name: "Asisten", permissions: ["evaluations.write", "attendance.record_all"] });
    await updateStaff(a.ctx, coach.membershipId, { roles: [], customRoleIds: [roleId] });
    const ctx = await loadAcademyContext(coach.session);
    expect(ctx.roles).toEqual([]);
    expect(ctx.can("attendance.record_all")).toBe(true);
    await expect(updateStaff(a.ctx, coach.membershipId, { roles: [], customRoleIds: [] })).rejects.toMatchObject({ status: 422 });
  });
});
