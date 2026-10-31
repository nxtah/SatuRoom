import "server-only";
import type { Tx } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { inAcademy, type AcademyContext } from "./context";
import { permissionsFor, type Permission, type Role } from "./permissions";

export interface Note {
  title: string;
  body?: string | null;
  href?: string | null;
}

export interface NotificationRow {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

/** Menyimpan notifikasi di aplikasi untuk beberapa pengguna sekaligus (tanpa push/WhatsApp). */
export async function notify(tx: Tx, businessId: string, userIds: readonly string[], note: Note): Promise<void> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  await tx.execute(sql`
    INSERT INTO bola.notifications (business_id, user_id, title, body, href)
    SELECT ${businessId}::uuid, u, ${note.title.slice(0, 120)}, ${note.body?.slice(0, 300) ?? null}, ${note.href ?? null}
    FROM unnest(${`{${ids.join(",")}}`}::uuid[]) AS u`);
}

/** Pengguna staf aktif yang punya izin tertentu (peran bawaan maupun custom). */
export async function staffWith(tx: Tx, businessId: string, permission: Permission, exceptUserId?: string): Promise<string[]> {
  const rows = (await tx.execute(sql`
    SELECT m.user_id AS "userId",
      coalesce((SELECT array_agg(r.role::text) FROM bola.staff_roles r WHERE r.membership_id = m.id), '{}') AS roles,
      coalesce((SELECT jsonb_agg(to_jsonb(c.permissions)) FROM bola.staff_custom_roles s JOIN bola.custom_roles c ON c.id = s.custom_role_id
                WHERE s.membership_id = m.id AND c.archived_at IS NULL), '[]'::jsonb) AS custom
    FROM core.memberships m WHERE m.business_id = ${businessId}::uuid AND m.status = 'active'`)) as unknown as {
    userId: string;
    roles: Role[];
    custom: string[][];
  }[];
  return rows
    .filter((r) => r.userId !== exceptUserId)
    .filter((r) => permissionsFor(r.roles, r.custom).has(permission))
    .map((r) => r.userId);
}

/** Akun pemain/orang tua yang terhubung ke pemain-pemain ini. */
export async function accountsOf(tx: Tx, playerIds: readonly string[]): Promise<string[]> {
  if (!playerIds.length) return [];
  const rows = (await tx.execute(sql`
    SELECT DISTINCT user_id AS "userId" FROM bola.player_accounts WHERE player_id = ANY (${`{${playerIds.join(",")}}`}::uuid[])`)) as unknown as { userId: string }[];
  return rows.map((r) => r.userId);
}

export async function listNotificationsIn(tx: Tx, userId: string, limit = 30): Promise<{ items: NotificationRow[]; unread: number }> {
  const items = (await tx.execute(sql`
    SELECT id, title, body, href, read_at IS NOT NULL AS read, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
    FROM bola.notifications WHERE user_id = ${userId}::uuid ORDER BY created_at DESC LIMIT ${limit}`)) as unknown as NotificationRow[];
  const [c] = (await tx.execute(sql`
    SELECT count(*)::int AS n FROM bola.notifications WHERE user_id = ${userId}::uuid AND read_at IS NULL`)) as unknown as { n: number }[];
  return { items, unread: c!.n };
}

export async function markReadIn(tx: Tx, userId: string, id?: string): Promise<void> {
  await tx.execute(sql`
    UPDATE bola.notifications SET read_at = now() WHERE user_id = ${userId}::uuid AND read_at IS NULL ${id ? sql`AND id = ${id}::uuid` : sql``}`);
}

export const myNotifications = (ctx: AcademyContext) => inAcademy(ctx, (tx) => listNotificationsIn(tx, ctx.userId));
export const markRead = (ctx: AcademyContext, id?: string) => inAcademy(ctx, (tx) => markReadIn(tx, ctx.userId, id));
