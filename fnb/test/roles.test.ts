import { describe, expect, it } from "vitest";
import { can, loadContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { archiveCustomRole, createCustomRole, listCustomRoles } from "@/server/roles";
import { listStaff, setStaffStatus, updateStaffRoles } from "@/server/staff";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e instanceof AppError && e.code === code) || (e instanceof Error && e.message === code));

describe("peran custom dan izin", () => {
  it("peran custom memberi izin yang dipilih, tidak lebih", async () => {
    const biz = await businessOf("Kopi Peran");
    const staff = await staffOf(biz, ["cashier"]);
    const { id } = await createCustomRole(biz.ctx, { name: "Kasir kopi", permissions: ["orders.sell", "cash.manage"] });
    await updateStaffRoles(biz.ctx, staff.membershipId, { roles: [], customRoleIds: [id] });
    const fresh = (await loadContext(staff.session))!;
    expect(can(fresh, "orders.sell")).toBe(true);
    expect(can(fresh, "cash.manage")).toBe(true);
    expect(can(fresh, "reports.read")).toBe(false);
    expect(can(fresh, "staff.manage")).toBe(false);
  });

  it("mengarsipkan peran langsung mencabut izinnya", async () => {
    const biz = await businessOf("Kopi Arsip");
    const staff = await staffOf(biz, ["cashier"]);
    const { id } = await createCustomRole(biz.ctx, { name: "Gudang malam", permissions: ["stock.manage"] });
    await updateStaffRoles(biz.ctx, staff.membershipId, { roles: ["cashier"], customRoleIds: [id] });
    expect(can((await loadContext(staff.session))!, "stock.manage")).toBe(true);
    await archiveCustomRole(biz.ctx, id);
    expect(can((await loadContext(staff.session))!, "stock.manage")).toBe(false);
    expect(await listCustomRoles(biz.ctx)).toHaveLength(0);
  });

  it("staf tanpa izin kelola peran ditolak", async () => {
    const biz = await businessOf("Kopi Tolak");
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(createCustomRole(cashier, { name: "Bebas", permissions: ["orders.sell"] }), "forbidden");
    await rejects(listStaff(cashier), "forbidden");
  });

  it("tidak bisa memberi izin yang tidak dimiliki sendiri", async () => {
    const biz = await businessOf("Kopi Naik Pangkat");
    const admin = await staffOf(biz, ["cashier"]);
    const { id } = await createCustomRole(biz.ctx, { name: "Admin staf", permissions: ["staff.manage", "roles.manage"] });
    await updateStaffRoles(biz.ctx, admin.membershipId, { roles: [], customRoleIds: [id] });
    const actor = (await loadContext(admin.session))!;
    await rejects(createCustomRole(actor, { name: "Lihat laporan", permissions: ["reports.read"] }), "escalation");
    const victim = await staffOf(biz, ["kitchen"]);
    await rejects(updateStaffRoles(actor, victim.membershipId, { roles: ["manager"], customRoleIds: [] }), "escalation");
  });

  it("peran bisnis lain tidak bisa dipasang", async () => {
    const a = await businessOf("Kopi A Peran");
    const b = await businessOf("Kopi B Peran");
    const { id } = await createCustomRole(b.ctx, { name: "Milik B", permissions: ["reports.read"] });
    const staff = await staffOf(a, ["cashier"]);
    await rejects(updateStaffRoles(a.ctx, staff.membershipId, { roles: [], customRoleIds: [id] }), "not_found");
  });

  it("menjaga Pemilik terakhir dan akun Pemilik dari non-Pemilik", async () => {
    const biz = await businessOf("Kopi Pemilik");
    const owner = (await listStaff(biz.ctx)).find((m) => m.roles.includes("owner"))!;
    await rejects(updateStaffRoles(biz.ctx, owner.membershipId, { roles: ["manager"], customRoleIds: [] }), "last_owner");
    await rejects(setStaffStatus(biz.ctx, owner.membershipId, "suspended"), "self");
    const manager = await staffOf(biz, ["manager"]);
    const { id } = await createCustomRole(biz.ctx, { name: "Admin staf 2", permissions: ["staff.manage"] });
    await updateStaffRoles(biz.ctx, manager.membershipId, { roles: ["manager"], customRoleIds: [id] });
    const actor = (await loadContext(manager.session))!;
    await rejects(updateStaffRoles(actor, owner.membershipId, { roles: ["manager"], customRoleIds: [] }), "forbidden");
    await rejects(setStaffStatus(actor, owner.membershipId, "suspended"), "forbidden");
  });

  it("staf yang dinonaktifkan kehilangan akses", async () => {
    const biz = await businessOf("Kopi Nonaktif");
    const staff = await staffOf(biz, ["cashier"]);
    await setStaffStatus(biz.ctx, staff.membershipId, "suspended");
    expect(await loadContext(staff.session)).toBeNull();
    await setStaffStatus(biz.ctx, staff.membershipId, "active");
    expect(await loadContext(staff.session)).not.toBeNull();
  });
});
