import "server-only";
import type { SessionInfo } from "@saturoom/core/auth";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { AttendanceStatus, NoticeInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { db } from "./db";
import { AppError, notFound } from "./errors";
import { sendGuardianInvite } from "./mail";
import { visiblePlayerIds } from "./players";
import { addDays, academyToday } from "./schedule";

interface ChildLink {
  businessId: string;
  playerId: string;
}

/** Anak yang terhubung ke pengguna ini. Sumber kebenaran ada di database (fungsi SECURITY DEFINER). */
async function childLinks(userId: string): Promise<ChildLink[]> {
  const rows = (await withContext(db(), { userId }, (tx) =>
    tx.execute(sql`SELECT business_id AS "businessId", player_id AS "playerId" FROM bola.my_children()`),
  )) as unknown as ChildLink[];
  return rows;
}

export async function hasChildren(userId: string): Promise<boolean> {
  return (await childLinks(userId)).length > 0;
}

async function linkFor(session: SessionInfo, playerId: string): Promise<ChildLink> {
  const link = (await childLinks(session.userId)).find((l) => l.playerId === playerId);
  if (!link) throw notFound("Pemain");
  return link;
}

/** Transaksi di akademi anak, atas nama wali. Query di dalamnya wajib dibatasi ke `link.playerId`. */
const asGuardian = <T>(session: SessionInfo, link: ChildLink, work: (tx: Tx) => Promise<T>) =>
  withContext(db(), { userId: session.userId, businessId: link.businessId }, work);

export interface ChildSession {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  kind: "training" | "match";
  teamName: string;
  cancelled: boolean;
  cancelReason: string | null;
  notice: { status: "excused" | "sick"; note: string | null } | null;
  attendance: AttendanceStatus | null;
  /** Masih bisa kirim/batalkan izin: sesi belum mulai, tidak batal, belum diabsen. */
  canNotify: boolean;
}

export interface ChildView {
  playerId: string;
  academyName: string;
  fullName: string;
  birthDate: string;
  shirtNumber: number | null;
  position: string | null;
  teamNames: string;
  upcoming: ChildSession[];
  attendance: {
    rate: number | null;
    counts: Record<AttendanceStatus, number>;
    recent: { date: string; kind: "training" | "match"; status: AttendanceStatus }[];
  };
  invoices: { id: string; period: string; amount: number; status: "unpaid" | "paid" | "waived"; paidOn: string | null }[];
  outstanding: number;
}

/** Semua yang dilihat wali di portal, per anak. */
export async function guardianHome(session: SessionInfo): Promise<ChildView[]> {
  const links = await childLinks(session.userId);
  return Promise.all(links.map((link) => asGuardian(session, link, (tx) => childView(tx, link.playerId))));
}

async function childView(tx: Tx, playerId: string): Promise<ChildView> {
  const today = await academyToday(tx);
  // Sesi dari jadwal rutin dibuat saat dibutuhkan, sama seperti di halaman jadwal staf.
  await tx.execute(sql`SELECT bola.generate_sessions(${today}::date, ${addDays(today, 14)}::date)`);

  const [player] = (await tx.execute(sql`
    SELECT p.full_name AS "fullName", to_char(p.birth_date, 'YYYY-MM-DD') AS "birthDate",
           p.shirt_number AS "shirtNumber", p.position, b.name AS "academyName",
           coalesce((SELECT string_agg(t.name, ', ' ORDER BY t.name) FROM bola.team_players tp
                      JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
                      WHERE tp.player_id = p.id), '') AS "teamNames"
    FROM bola.players p JOIN core.businesses b ON b.id = p.business_id
    WHERE p.id = ${playerId}::uuid`)) as unknown as Omit<ChildView, "playerId" | "upcoming" | "attendance" | "invoices" | "outstanding">[];
  if (!player) throw notFound("Pemain");

  const upcoming = (await tx.execute(sql`
    SELECT s.id AS "sessionId",
           to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date,
           to_char(s.starts_at AT TIME ZONE b.timezone, 'HH24:MI') AS "startTime",
           to_char(s.ends_at AT TIME ZONE b.timezone, 'HH24:MI') AS "endTime",
           s.kind, t.name AS "teamName", s.status = 'cancelled' AS cancelled, s.cancel_reason AS "cancelReason",
           n.status AS "noticeStatus", n.note AS "noticeNote", a.status AS attendance,
           (s.status = 'scheduled' AND s.starts_at > now() AND a.status IS NULL) AS "canNotify"
    FROM bola.sessions s
    JOIN bola.team_players tp ON tp.team_id = s.team_id AND tp.player_id = ${playerId}::uuid
    JOIN bola.teams t ON t.id = s.team_id AND t.archived_at IS NULL
    JOIN core.businesses b ON b.id = s.business_id
    LEFT JOIN bola.absence_notices n ON n.session_id = s.id AND n.player_id = ${playerId}::uuid
    LEFT JOIN bola.attendance a ON a.session_id = s.id AND a.player_id = ${playerId}::uuid
    WHERE s.ends_at > now()
      AND s.starts_at < (${addDays(today, 15)}::date)::timestamp AT TIME ZONE b.timezone
    ORDER BY s.starts_at
    LIMIT 8`)) as unknown as (Omit<ChildSession, "notice"> & {
    noticeStatus: "excused" | "sick" | null;
    noticeNote: string | null;
  })[];

  const recent = (await tx.execute(sql`
    SELECT to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date, s.kind, a.status
    FROM bola.attendance a
    JOIN bola.sessions s ON s.id = a.session_id
    JOIN core.businesses b ON b.id = s.business_id
    WHERE a.player_id = ${playerId}::uuid AND s.starts_at > now() - interval '60 days'
    ORDER BY s.starts_at DESC`)) as unknown as ChildView["attendance"]["recent"];

  const invoices = (await tx.execute(sql`
    SELECT i.id, to_char(i.period, 'YYYY-MM') AS period, i.amount, i.status,
           to_char(i.paid_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "paidOn"
    FROM bola.invoices i JOIN core.businesses b ON b.id = i.business_id
    WHERE i.player_id = ${playerId}::uuid
    ORDER BY i.period DESC
    LIMIT 6`)) as unknown as ChildView["invoices"];

  const counts = { present: 0, excused: 0, sick: 0, absent: 0 } as Record<AttendanceStatus, number>;
  for (const r of recent) counts[r.status]++;
  return {
    ...player,
    playerId,
    upcoming: upcoming.map(({ noticeStatus, noticeNote, ...s }) => ({
      ...s,
      notice: noticeStatus ? { status: noticeStatus, note: noticeNote } : null,
    })),
    attendance: {
      rate: recent.length ? Math.round((counts.present / recent.length) * 100) : null,
      counts,
      recent: recent.slice(0, 10),
    },
    invoices,
    outstanding: invoices.filter((i) => i.status === "unpaid").reduce((s, i) => s + i.amount, 0),
  };
}

/** Wali memberi tahu anak izin/sakit untuk satu sesi yang belum mulai. */
export async function submitNotice(session: SessionInfo, input: z.infer<typeof NoticeInput>): Promise<void> {
  const link = await linkFor(session, input.playerId);
  await asGuardian(session, link, async (tx) => {
    await assertNotifiable(tx, input.sessionId, input.playerId);
    await tx.execute(sql`
      INSERT INTO bola.absence_notices (business_id, session_id, player_id, status, note, created_by)
      VALUES (${link.businessId}::uuid, ${input.sessionId}::uuid, ${input.playerId}::uuid,
              ${input.status}, ${input.note || null}, ${session.userId}::uuid)
      ON CONFLICT (session_id, player_id)
      DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, created_by = EXCLUDED.created_by, created_at = now()`);
    await tx.insert(auditEvents).values({
      businessId: link.businessId,
      actorUserId: session.userId,
      action: "absence_notice.submitted",
      targetType: "session",
      targetId: input.sessionId,
      meta: { playerId: input.playerId, status: input.status },
    });
  });
}

export async function cancelNotice(session: SessionInfo, playerId: string, sessionId: string): Promise<void> {
  const link = await linkFor(session, playerId);
  await asGuardian(session, link, async (tx) => {
    await assertNotifiable(tx, sessionId, playerId);
    await tx.execute(sql`
      DELETE FROM bola.absence_notices WHERE session_id = ${sessionId}::uuid AND player_id = ${playerId}::uuid`);
  });
}

async function assertNotifiable(tx: Tx, sessionId: string, playerId: string) {
  const [s] = (await tx.execute(sql`
    SELECT s.status, s.starts_at > now() AS future,
           EXISTS (SELECT 1 FROM bola.attendance a WHERE a.session_id = s.id AND a.player_id = ${playerId}::uuid) AS recorded
    FROM bola.sessions s
    JOIN bola.team_players tp ON tp.team_id = s.team_id AND tp.player_id = ${playerId}::uuid
    WHERE s.id = ${sessionId}::uuid`)) as unknown as { status: string; future: boolean; recorded: boolean }[];
  if (!s) throw notFound("Jadwal");
  if (s.status === "cancelled") throw new AppError(409, "cancelled", "Latihan ini sudah dibatalkan.");
  if (!s.future || s.recorded) throw new AppError(409, "closed", "Latihan sudah mulai. Hubungi pelatih langsung.");
}

export interface MyGuardianInvitation {
  id: string;
  academyName: string;
  playerName: string;
  invitedByName: string | null;
}

export async function myGuardianInvitations(userId: string): Promise<MyGuardianInvitation[]> {
  return (await withContext(db(), { userId }, (tx) =>
    tx.execute(sql`
      SELECT id, academy_name AS "academyName", player_name AS "playerName", invited_by_name AS "invitedByName"
      FROM bola.my_guardian_invitations()`),
  )) as unknown as MyGuardianInvitation[];
}

export async function acceptGuardianInvitation(session: SessionInfo, invitationId: string): Promise<string> {
  const [row] = (await withContext(db(), { userId: session.userId }, (tx) =>
    tx.execute(sql`SELECT bola.accept_guardian_invitation(${invitationId}::uuid) AS id`),
  )) as unknown as { id: string | null }[];
  if (!row?.id) throw notFound("Undangan");
  return row.id;
}

/* ---------- Sisi staf: mengelola akun wali seorang pemain ---------- */

export interface GuardianAccess {
  linked: { userId: string; name: string; email: string }[];
  pending: { id: string; email: string; expiresAt: string }[];
}

async function assertGuardianAdmin(ctx: AcademyContext, tx: Tx, playerId: string) {
  requirePermission(ctx, "guardians.read");
  const scope = await visiblePlayerIds(ctx, tx);
  if (scope && !scope.includes(playerId)) throw notFound("Pemain");
}

export function guardianAccess(ctx: AcademyContext, playerId: string): Promise<GuardianAccess> {
  return inAcademy(ctx, async (tx) => {
    await assertGuardianAdmin(ctx, tx, playerId);
    const linked = (await tx.execute(sql`
      SELECT u.id AS "userId", u.name, u.email FROM bola.guardians g JOIN core.users u ON u.id = g.user_id
      WHERE g.player_id = ${playerId}::uuid ORDER BY g.created_at`)) as unknown as GuardianAccess["linked"];
    const pending = (await tx.execute(sql`
      SELECT id, email, to_char(expires_at, 'YYYY-MM-DD') AS "expiresAt" FROM bola.guardian_invitations
      WHERE player_id = ${playerId}::uuid AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()
      ORDER BY created_at`)) as unknown as GuardianAccess["pending"];
    return { linked, pending };
  });
}

export async function inviteGuardian(ctx: AcademyContext, playerId: string, email: string): Promise<void> {
  requirePermission(ctx, "players.manage");
  const { academyName, playerName } = await inAcademy(ctx, async (tx) => {
    await assertGuardianAdmin(ctx, tx, playerId);
    const [already] = (await tx.execute(sql`
      SELECT 1 FROM bola.guardians g JOIN core.users u ON u.id = g.user_id
      WHERE g.player_id = ${playerId}::uuid AND u.email = ${email}::citext`)) as unknown as unknown[];
    if (already) throw new AppError(409, "already_linked", "Email ini sudah terhubung sebagai wali pemain ini.");
    // Undangan lama ke email yang sama diganti agar masa berlakunya mulai lagi.
    await tx.execute(sql`
      UPDATE bola.guardian_invitations SET revoked_at = now()
      WHERE player_id = ${playerId}::uuid AND email = ${email}::citext AND accepted_at IS NULL AND revoked_at IS NULL`);
    await tx.execute(sql`
      INSERT INTO bola.guardian_invitations (business_id, player_id, email, invited_by)
      VALUES (${ctx.businessId}::uuid, ${playerId}::uuid, ${email}, ${ctx.userId}::uuid)`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "guardian.invited",
      targetType: "player",
      targetId: playerId,
    });
    const [row] = (await tx.execute(sql`
      SELECT b.name AS "academyName", p.full_name AS "playerName"
      FROM bola.players p JOIN core.businesses b ON b.id = p.business_id
      WHERE p.id = ${playerId}::uuid`)) as unknown as { academyName: string; playerName: string }[];
    return row!;
  });
  try {
    await sendGuardianInvite(email, academyName, playerName);
  } catch (error) {
    // Undangan tetap sah; wali bisa membukanya dari /undangan setelah masuk.
    console.error("gagal mengirim email undangan wali", error);
  }
}

export async function revokeGuardianInvitation(ctx: AcademyContext, playerId: string, invitationId: string): Promise<void> {
  requirePermission(ctx, "players.manage");
  await inAcademy(ctx, async (tx) => {
    await assertGuardianAdmin(ctx, tx, playerId);
    await tx.execute(sql`
      UPDATE bola.guardian_invitations SET revoked_at = now()
      WHERE id = ${invitationId}::uuid AND player_id = ${playerId}::uuid AND accepted_at IS NULL`);
  });
}

export async function unlinkGuardian(ctx: AcademyContext, playerId: string, userId: string): Promise<void> {
  requirePermission(ctx, "players.manage");
  await inAcademy(ctx, async (tx) => {
    await assertGuardianAdmin(ctx, tx, playerId);
    await tx.execute(sql`DELETE FROM bola.guardians WHERE player_id = ${playerId}::uuid AND user_id = ${userId}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "guardian.unlinked",
      targetType: "player",
      targetId: playerId,
      meta: { userId },
    });
  });
}
