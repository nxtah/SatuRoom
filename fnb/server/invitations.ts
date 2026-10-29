import "server-only";
import { isEmailVerified, setActiveBusiness, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { auditEvents, businesses } from "@saturoom/core/schema";
import { eq, sql } from "drizzle-orm";
import type { z } from "zod";
import { permissionsFor, ROLE_LABEL, type BuiltinRole } from "@/lib/permissions";
import type { InviteInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { sendStaffInvite } from "./mail";
import { assertCanGrant } from "./roles";

export interface PendingInvite {
  id: string;
  email: string;
  roles: BuiltinRole[];
  customRoles: string[];
  expiresAt: Date;
}

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

/** Driver bisa mengirim array enum sebagai teks "{a,b}". */
const list = (v: unknown): string[] => (Array.isArray(v) ? v : String(v ?? "").replace(/[{}"]/g, "").split(",")).filter(Boolean);

export async function listInvites(ctx: FnbContext): Promise<PendingInvite[]> {
  if (!can(ctx, "staff.manage")) throw forbidden();
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT i.id, i.email::text AS email, i.roles, i.expires_at AS "expiresAt",
        COALESCE((SELECT array_agg(c.name ORDER BY c.name) FROM fnb.custom_roles c WHERE c.id = ANY(i.custom_role_ids) AND c.archived_at IS NULL), '{}') AS "customRoles"
      FROM fnb.invitations i
      WHERE i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now() ORDER BY i.created_at`)) as unknown as {
      id: string; email: string; roles: unknown; expiresAt: Date; customRoles: unknown;
    }[];
    return rows.map((r) => ({ ...r, roles: list(r.roles) as BuiltinRole[], customRoles: list(r.customRoles) }));
  });
}

export async function inviteStaff(ctx: FnbContext, input: z.infer<typeof InviteInput>): Promise<{ id: string; emailSent: boolean }> {
  if (!can(ctx, "staff.manage")) throw forbidden();
  const email = input.email.toLowerCase();
  const roles = [...new Set(input.roles)];
  const customRoleIds = [...new Set(input.customRoleIds)];
  if (roles.includes("owner") && !ctx.roles.includes("owner")) throw forbidden();

  const { id, name, labels } = await inBusiness(ctx, async (tx) => {
    const custom = customRoleIds.length
      ? ((await tx.execute(sql`SELECT name, permissions FROM fnb.custom_roles WHERE archived_at IS NULL AND id IN (${sql.join(customRoleIds.map((c) => sql`${c}::uuid`), sql`, `)})`)) as unknown as { name: string; permissions: string[] }[])
      : [];
    if (custom.length !== customRoleIds.length) throw notFound("Peran");
    assertCanGrant(ctx, [...permissionsFor(roles, custom.map((c) => c.permissions))]);
    const [member] = (await tx.execute(sql`
      SELECT 1 FROM core.memberships m JOIN core.users u ON u.id = m.user_id
      WHERE m.business_id = ${ctx.businessId}::uuid AND u.email = ${email}::citext AND m.status = 'active'`)) as unknown as unknown[];
    if (member) throw new AppError(409, "already_member", "Orang ini sudah menjadi staf.");
    // Mengundang ulang email yang sama menggantikan undangan lama.
    await tx.execute(sql`UPDATE fnb.invitations SET revoked_at = now() WHERE email = ${email}::citext AND accepted_at IS NULL AND revoked_at IS NULL`);
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.invitations (business_id, email, roles, custom_role_ids, invited_by)
      VALUES (${ctx.businessId}::uuid, ${email}, ${`{${roles.join(",")}}`}::fnb.staff_role[], ${`{${customRoleIds.join(",")}}`}::uuid[], ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.staff.invited", targetType: "invitation", targetId: row!.id,
      meta: { roles, customRoleIds },
    });
    const [biz] = await tx.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, ctx.businessId));
    return { id: row!.id, name: biz?.name ?? "Rasa", labels: [...roles.map((r) => ROLE_LABEL[r]), ...custom.map((c) => c.name)].join(", ") };
  });

  // Gagal kirim email tidak membatalkan undangan; penerima tetap melihatnya di /undangan setelah masuk.
  let emailSent = true;
  await sendStaffInvite(email, name, ctx.session.name, labels).catch((error: unknown) => {
    emailSent = false;
    console.error("gagal kirim undangan", error instanceof Error ? error.message : error);
  });
  return { id, emailSent };
}

export async function revokeInvitation(ctx: FnbContext, id: string): Promise<void> {
  if (!can(ctx, "staff.manage")) throw forbidden();
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE fnb.invitations SET revoked_at = now() WHERE id = ${id}::uuid AND accepted_at IS NULL AND revoked_at IS NULL RETURNING roles`)) as unknown as { roles: unknown }[];
    if (!rows.length) throw notFound("Undangan");
    if (list(rows[0]!.roles).includes("owner") && !ctx.roles.includes("owner")) throw forbidden();
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.staff.invitation_revoked", targetType: "invitation", targetId: id,
    });
  });
}

// ---------- Sisi penerima undangan (belum tentu punya bisnis aktif) ----------

export interface MyInvitation {
  id: string;
  businessName: string;
  invitedByName: string | null;
  roles: BuiltinRole[];
  customRoles: string[];
}

export async function myInvitations(userId: string): Promise<MyInvitation[]> {
  // Undangan dikirim ke alamat email; hanya yang terbukti memiliki alamat itu yang boleh melihatnya.
  if (!(await isEmailVerified(db(), userId))) return [];
  const rows = (await withContext(db(), { userId }, (tx) =>
    tx.execute(sql`SELECT id, business_name, invited_by_name, roles, custom_roles FROM fnb.my_invitations()`),
  )) as unknown as { id: string; business_name: string; invited_by_name: string | null; roles: unknown; custom_roles: unknown }[];
  return rows.map((r) => ({
    id: r.id, businessName: r.business_name, invitedByName: r.invited_by_name,
    roles: list(r.roles) as BuiltinRole[], customRoles: list(r.custom_roles),
  }));
}

export async function acceptInvitation(session: SessionInfo, invitationId: string): Promise<string> {
  if (!(await isEmailVerified(db(), session.userId))) {
    throw new AppError(403, "email_unverified", "Konfirmasi email Anda dulu lewat link yang kami kirim, lalu buka undangannya lagi.");
  }
  const [row] = (await withContext(db(), { userId: session.userId }, (tx) =>
    tx.execute(sql`SELECT fnb.accept_invitation(${invitationId}::uuid) AS id`),
  )) as unknown as { id: string | null }[];
  if (!row?.id) throw notFound("Undangan");
  await setActiveBusiness(db(), session.sessionId, row.id);
  return row.id;
}
