import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents, memberships } from "@saturoom/core/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { BUILTIN_ROLES, permissionsFor, type BuiltinRole } from "@/lib/permissions";
import type { StaffRolesInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { assertCanGrant } from "./roles";
import { customRoles, staffCustomRoles, staffRoles } from "./schema";

export interface StaffMember {
  membershipId: string;
  name: string;
  email: string;
  status: "active" | "suspended";
  roles: BuiltinRole[];
  customRoles: { id: string; name: string }[];
}

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

export async function listStaff(ctx: FnbContext): Promise<StaffMember[]> {
  if (!can(ctx, "staff.manage")) throw forbidden();
  return inBusiness(ctx, async (tx) => {
    const people = (await tx.execute(sql`
      SELECT m.id AS "membershipId", u.name, u.email::text AS email, m.status
      FROM core.memberships m JOIN core.users u ON u.id = m.user_id
      WHERE m.business_id = ${ctx.businessId}::uuid AND m.status IN ('active', 'suspended')
      ORDER BY u.name`)) as unknown as Omit<StaffMember, "roles" | "customRoles">[];
    const roles = await tx.select().from(staffRoles);
    const custom = (await tx.execute(sql`
      SELECT s.membership_id AS "membershipId", r.id, r.name
      FROM fnb.staff_custom_roles s JOIN fnb.custom_roles r ON r.id = s.custom_role_id
      WHERE r.archived_at IS NULL ORDER BY lower(r.name)`)) as unknown as { membershipId: string; id: string; name: string }[];
    const rank = (r: BuiltinRole) => BUILTIN_ROLES.indexOf(r);
    return people
      .map((p) => ({
        ...p,
        roles: roles.filter((r) => r.membershipId === p.membershipId).map((r) => r.role as BuiltinRole).sort((a, b) => rank(a) - rank(b)),
        customRoles: custom.filter((c) => c.membershipId === p.membershipId).map(({ id, name }) => ({ id, name })),
      }))
      .sort((a, b) => rank(a.roles[0] ?? "server") - rank(b.roles[0] ?? "server") || a.name.localeCompare(b.name));
  });
}

/** Hanya Pemilik yang boleh menyentuh akun Pemilik. */
function assertCanTouchOwner(ctx: FnbContext, member: StaffMember, nextRoles: readonly string[] = []) {
  if ((member.roles.includes("owner") || nextRoles.includes("owner")) && !ctx.roles.includes("owner")) throw forbidden();
}

/** Bisnis harus selalu punya minimal satu Pemilik aktif selain yang sedang diubah. */
async function assertAnotherOwner(tx: Parameters<Parameters<typeof withContext>[2]>[0], membershipId: string) {
  const [row] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(staffRoles)
    .innerJoin(memberships, eq(memberships.id, staffRoles.membershipId))
    .where(and(eq(staffRoles.role, "owner"), eq(memberships.status, "active"), sql`${memberships.id} <> ${membershipId}::uuid`));
  if (!row?.n) throw new AppError(409, "last_owner", "Bisnis harus punya minimal satu Pemilik. Jadikan orang lain Pemilik dulu.");
}

export async function updateStaffRoles(ctx: FnbContext, membershipId: string, input: z.infer<typeof StaffRolesInput>): Promise<void> {
  if (!can(ctx, "staff.manage")) throw forbidden();
  const member = (await listStaff(ctx)).find((m) => m.membershipId === membershipId);
  if (!member) throw notFound("Staf");
  const roles = [...new Set(input.roles)];
  const customRoleIds = [...new Set(input.customRoleIds)];
  assertCanTouchOwner(ctx, member, roles);
  await inBusiness(ctx, async (tx) => {
    const customPerms = customRoleIds.length
      ? await tx.select({ permissions: customRoles.permissions }).from(customRoles).where(and(isNull(customRoles.archivedAt), inArray(customRoles.id, customRoleIds)))
      : [];
    if (customPerms.length !== customRoleIds.length) throw notFound("Peran");
    assertCanGrant(ctx, [...permissionsFor(roles, customPerms.map((c) => c.permissions))]);
    if (member.roles.includes("owner") && !roles.includes("owner")) await assertAnotherOwner(tx, membershipId);
    await tx.delete(staffRoles).where(eq(staffRoles.membershipId, membershipId));
    await tx.delete(staffCustomRoles).where(eq(staffCustomRoles.membershipId, membershipId));
    if (roles.length) await tx.insert(staffRoles).values(roles.map((role) => ({ businessId: ctx.businessId, membershipId, role })));
    if (customRoleIds.length) {
      await tx.insert(staffCustomRoles).values(customRoleIds.map((customRoleId) => ({ businessId: ctx.businessId, membershipId, customRoleId })));
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "fnb.staff.roles_changed",
      targetType: "membership",
      targetId: membershipId,
      meta: { roles, customRoleIds },
    });
  });
}

/** Menonaktifkan staf langsung mencabut akses: konteks dibaca ulang di setiap permintaan. */
export async function setStaffStatus(ctx: FnbContext, membershipId: string, status: "active" | "suspended"): Promise<void> {
  if (!can(ctx, "staff.manage")) throw forbidden();
  if (membershipId === ctx.membershipId) throw new AppError(409, "self", "Anda tidak bisa menonaktifkan akun Anda sendiri.");
  const member = (await listStaff(ctx)).find((m) => m.membershipId === membershipId);
  if (!member) throw notFound("Staf");
  assertCanTouchOwner(ctx, member);
  await inBusiness(ctx, async (tx) => {
    if (status === "suspended" && member.roles.includes("owner")) await assertAnotherOwner(tx, membershipId);
    await tx.update(memberships).set({ status }).where(eq(memberships.id, membershipId));
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: status === "active" ? "fnb.staff.reactivated" : "fnb.staff.suspended",
      targetType: "membership",
      targetId: membershipId,
    });
  });
}
