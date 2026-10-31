import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { CustomRoleInput } from "@/lib/schemas";
import { inAcademy, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { PERMISSIONS, type Permission } from "./permissions";
import { customRoles } from "./schema";

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  members: number;
}

const known = (list: readonly string[]) => PERMISSIONS.filter((p) => list.includes(p));

/** Staf hanya boleh memberi izin yang dia punya sendiri; peran custom bukan jalan pintas naik pangkat. */
export function assertCanGrant(ctx: AcademyContext, permissions: readonly string[]) {
  if (permissions.some((p) => !ctx.can(p as Permission))) {
    throw new AppError(403, "escalation", "Anda hanya bisa memberi izin yang Anda miliki sendiri.");
  }
}

export async function listCustomRoles(ctx: AcademyContext): Promise<CustomRole[]> {
  if (!ctx.can("roles.manage") && !ctx.can("staff.manage")) throw forbidden();
  return inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT r.id, r.name, r.description, r.permissions,
        (SELECT count(*)::int FROM bola.staff_custom_roles s JOIN core.memberships m ON m.id = s.membership_id
          WHERE s.custom_role_id = r.id AND m.status <> 'removed') AS members
      FROM bola.custom_roles r WHERE r.archived_at IS NULL ORDER BY lower(r.name)`)) as unknown as {
      id: string;
      name: string;
      description: string | null;
      permissions: string[];
      members: number;
    }[];
    return rows.map((r) => ({ ...r, permissions: known(r.permissions) }));
  });
}

const duplicate = (e: unknown) =>
  e instanceof Error && /custom_roles_name|duplicate key/.test(`${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}`);

type Input = z.infer<typeof CustomRoleInput>;

export async function createCustomRole(ctx: AcademyContext, input: Input): Promise<string> {
  if (!ctx.can("roles.manage")) throw forbidden();
  assertCanGrant(ctx, input.permissions);
  try {
    return await inAcademy(ctx, async (tx) => {
      const [row] = await tx
        .insert(customRoles)
        .values({ businessId: ctx.businessId, name: input.name, description: input.description || null, permissions: [...new Set(input.permissions)] })
        .returning({ id: customRoles.id });
      await tx.insert(auditEvents).values({
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        action: "role.created",
        targetType: "custom_role",
        targetId: row!.id,
        meta: { name: input.name, permissions: input.permissions },
      });
      return row!.id;
    });
  } catch (e) {
    if (duplicate(e)) throw new AppError(409, "duplicate", "Nama peran ini sudah dipakai.", { name: "Nama peran ini sudah dipakai." });
    throw e;
  }
}

export async function updateCustomRole(ctx: AcademyContext, id: string, input: Input): Promise<void> {
  if (!ctx.can("roles.manage")) throw forbidden();
  assertCanGrant(ctx, input.permissions);
  try {
    await inAcademy(ctx, async (tx) => {
      const rows = await tx
        .update(customRoles)
        .set({ name: input.name, description: input.description || null, permissions: [...new Set(input.permissions)] })
        .where(and(eq(customRoles.id, id), isNull(customRoles.archivedAt)))
        .returning({ id: customRoles.id });
      if (!rows.length) throw notFound("Peran");
      await tx.insert(auditEvents).values({
        businessId: ctx.businessId,
        actorUserId: ctx.userId,
        action: "role.updated",
        targetType: "custom_role",
        targetId: id,
        meta: { name: input.name, permissions: input.permissions },
      });
    });
  } catch (e) {
    if (duplicate(e)) throw new AppError(409, "duplicate", "Nama peran ini sudah dipakai.", { name: "Nama peran ini sudah dipakai." });
    throw e;
  }
}

/** Peran diarsipkan, bukan dihapus: izin staf yang memakainya langsung berhenti, riwayat tetap utuh. */
export async function archiveCustomRole(ctx: AcademyContext, id: string): Promise<void> {
  if (!ctx.can("roles.manage")) throw forbidden();
  await inAcademy(ctx, async (tx) => {
    const rows = await tx
      .update(customRoles)
      .set({ archivedAt: new Date() })
      .where(and(eq(customRoles.id, id), isNull(customRoles.archivedAt)))
      .returning({ id: customRoles.id });
    if (!rows.length) throw notFound("Peran");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "role.archived",
      targetType: "custom_role",
      targetId: id,
    });
  });
}
