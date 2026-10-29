import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import type { CustomRoleInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { customRoles } from "./schema";

export interface CustomRole {
  id: string;
  name: string;
  permissions: Permission[];
  members: number;
}

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

const known = (list: string[]) => PERMISSIONS.filter((p) => list.includes(p));

/** Staf hanya boleh memberi izin yang dia sendiri punya; peran custom tidak bisa jadi jalan pintas naik pangkat. */
export function assertCanGrant(ctx: FnbContext, permissions: readonly Permission[]) {
  if (permissions.some((p) => !can(ctx, p))) {
    throw new AppError(403, "escalation", "Anda hanya bisa memberi izin yang Anda miliki sendiri.");
  }
}

export async function listCustomRoles(ctx: FnbContext): Promise<CustomRole[]> {
  if (!can(ctx, "roles.manage") && !can(ctx, "staff.manage")) throw forbidden();
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT r.id, r.name, r.permissions,
        (SELECT count(*)::int FROM fnb.staff_custom_roles s JOIN core.memberships m ON m.id = s.membership_id
          WHERE s.custom_role_id = r.id AND m.status <> 'removed') AS members
      FROM fnb.custom_roles r WHERE r.archived_at IS NULL ORDER BY lower(r.name)`)) as unknown as {
      id: string;
      name: string;
      permissions: string[];
      members: number;
    }[];
    return rows.map((r) => ({ ...r, permissions: known(r.permissions) }));
  });
}

const duplicate = (e: unknown) => e instanceof Error && /custom_roles_name|duplicate key/.test(`${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}`);

export async function createCustomRole(ctx: FnbContext, input: z.infer<typeof CustomRoleInput>): Promise<{ id: string }> {
  if (!can(ctx, "roles.manage")) throw forbidden();
  assertCanGrant(ctx, input.permissions);
  try {
    return await inBusiness(ctx, async (tx) => {
      const [row] = await tx
        .insert(customRoles)
        .values({ businessId: ctx.businessId, name: input.name, permissions: [...new Set(input.permissions)] })
        .returning({ id: customRoles.id });
      await tx.insert(auditEvents).values({
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        action: "fnb.role.created",
        targetType: "custom_role",
        targetId: row!.id,
        meta: { name: input.name, permissions: input.permissions },
      });
      return { id: row!.id };
    });
  } catch (e) {
    if (duplicate(e)) throw new AppError(409, "duplicate", "Nama peran ini sudah dipakai.");
    throw e;
  }
}

export async function updateCustomRole(ctx: FnbContext, id: string, input: z.infer<typeof CustomRoleInput>): Promise<void> {
  if (!can(ctx, "roles.manage")) throw forbidden();
  assertCanGrant(ctx, input.permissions);
  try {
    await inBusiness(ctx, async (tx) => {
      const rows = await tx
        .update(customRoles)
        .set({ name: input.name, permissions: [...new Set(input.permissions)] })
        .where(and(eq(customRoles.id, id), isNull(customRoles.archivedAt)))
        .returning({ id: customRoles.id });
      if (!rows.length) throw notFound("Peran");
      await tx.insert(auditEvents).values({
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        action: "fnb.role.updated",
        targetType: "custom_role",
        targetId: id,
        meta: { name: input.name, permissions: input.permissions },
      });
    });
  } catch (e) {
    if (duplicate(e)) throw new AppError(409, "duplicate", "Nama peran ini sudah dipakai.");
    throw e;
  }
}

/** Peran diarsipkan, bukan dihapus: izin staf yang memakainya langsung berhenti berlaku, riwayat audit tetap utuh. */
export async function archiveCustomRole(ctx: FnbContext, id: string): Promise<void> {
  if (!can(ctx, "roles.manage")) throw forbidden();
  await inBusiness(ctx, async (tx) => {
    const rows = await tx
      .update(customRoles)
      .set({ archivedAt: new Date() })
      .where(and(eq(customRoles.id, id), isNull(customRoles.archivedAt)))
      .returning({ id: customRoles.id });
    if (!rows.length) throw notFound("Peran");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "fnb.role.archived",
      targetType: "custom_role",
      targetId: id,
    });
  });
}
