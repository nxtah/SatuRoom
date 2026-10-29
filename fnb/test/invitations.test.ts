import { describe, expect, it } from "vitest";
import { can, loadContext } from "@/server/context";
import { db } from "@/server/db";
import { acceptInvitation, inviteStaff, listInvites, myInvitations, revokeInvitation } from "@/server/invitations";
import { createCustomRole } from "@/server/roles";
import { listStaff } from "@/server/staff";
import { businessOf, staffOf, userOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string; message?: string }).code === code || (e as Error).message === code);

describe("undangan staf", () => {
  it("penerima bergabung dengan peran bawaan dan peran custom", async () => {
    const biz = await businessOf("Kopi Undang");
    const { id: customId } = await createCustomRole(biz.ctx, { name: "Admin gudang", permissions: ["stock.manage"] });
    const user = await userOf("Calon Staf");
    const sent = await inviteStaff(biz.ctx, { email: user.email, roles: ["cashier"], customRoleIds: [customId] });
    expect(sent.emailSent).toBe(false); // SMTP tidak dikonfigurasi di test: undangan tetap tersimpan
    expect((await listInvites(biz.ctx)).map((i) => i.email)).toEqual([user.email]);

    const mine = await myInvitations(user.userId);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ businessName: "Kopi Undang", roles: ["cashier"], customRoles: ["Admin gudang"] });

    expect(await acceptInvitation(user, mine[0]!.id)).toBe(biz.id);
    const ctx = (await loadContext({ ...user, activeBusinessId: biz.id }))!;
    expect(can(ctx, "orders.sell")).toBe(true);
    expect(can(ctx, "stock.manage")).toBe(true);
    expect(can(ctx, "reports.read")).toBe(false);
    expect(await listInvites(biz.ctx)).toHaveLength(0);
    expect((await listStaff(biz.ctx)).some((m) => m.email === user.email)).toBe(true);
    await rejects(acceptInvitation(user, mine[0]!.id), "not_found");
  });

  it("undangan yang dicabut tidak bisa diterima", async () => {
    const biz = await businessOf("Kopi Cabut");
    const user = await userOf("Calon");
    await inviteStaff(biz.ctx, { email: user.email, roles: ["server"], customRoleIds: [] });
    const [invite] = await listInvites(biz.ctx);
    await revokeInvitation(biz.ctx, invite!.id);
    expect(await myInvitations(user.userId)).toHaveLength(0);
    await rejects(acceptInvitation(user, invite!.id), "not_found");
  });

  it("undangan hanya bisa diterima pemilik email itu", async () => {
    const biz = await businessOf("Kopi Salah Orang");
    const target = await userOf("Target");
    const other = await userOf("Orang Lain");
    await inviteStaff(biz.ctx, { email: target.email, roles: ["server"], customRoleIds: [] });
    const [invite] = await listInvites(biz.ctx);
    await rejects(acceptInvitation(other, invite!.id), "not_found");
  });

  it("menolak izin berlebih, staf tanpa izin, dan staf yang sudah ada", async () => {
    const biz = await businessOf("Kopi Aturan Undang");
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(inviteStaff(cashier, { email: "x@contoh.id", roles: ["server"], customRoleIds: [] }), "forbidden");

    const { id } = await createCustomRole(biz.ctx, { name: "Admin staf", permissions: ["staff.manage"] });
    const admin = await staffOf(biz, ["kitchen"]);
    const { updateStaffRoles } = await import("@/server/staff");
    await updateStaffRoles(biz.ctx, admin.membershipId, { roles: [], customRoleIds: [id] });
    const actor = (await loadContext(admin.session))!;
    await rejects(inviteStaff(actor, { email: "y@contoh.id", roles: ["manager"], customRoleIds: [] }), "escalation");
    await rejects(inviteStaff(actor, { email: "z@contoh.id", roles: ["owner"], customRoleIds: [] }), "forbidden");

    const existing = (await listStaff(biz.ctx)).find((m) => m.roles.includes("cashier"))!;
    await rejects(inviteStaff(biz.ctx, { email: existing.email, roles: ["server"], customRoleIds: [] }), "already_member");
  });

  it("belum terverifikasi tidak melihat undangan", async () => {
    const { registerUser } = await import("@saturoom/core/auth");
    const biz = await businessOf("Kopi Belum Verifikasi");
    const email = `baru${Date.now()}@contoh.id`;
    const reg = await registerUser(db(), { name: "Baru", email, password: "password-rahasia" });
    if (reg.status !== "created") throw new Error("gagal daftar");
    await inviteStaff(biz.ctx, { email, roles: ["server"], customRoleIds: [] });
    expect(await myInvitations(reg.userId)).toHaveLength(0);
  });

  it("peran bisnis lain tidak bisa dipakai di undangan", async () => {
    const a = await businessOf("Kopi A Undang");
    const b = await businessOf("Kopi B Undang");
    const { id } = await createCustomRole(b.ctx, { name: "Milik B", permissions: ["reports.read"] });
    await rejects(inviteStaff(a.ctx, { email: "q@contoh.id", roles: [], customRoleIds: [id] }), "not_found");
  });
});
