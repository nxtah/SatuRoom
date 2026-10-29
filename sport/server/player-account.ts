import "server-only";
import { isEmailVerified, type SessionInfo } from "@saturoom/core/auth";
import { newToken } from "@saturoom/core/crypto";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { AttendanceStatus, NoticeInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { db } from "./db";
import { announcementsForPlayer } from "./announcements";
import { evaluationsForPlayer } from "./evaluations";
import { AppError, notFound, unverifiedEmail } from "./errors";
import { sendPlayerInvite } from "./mail";
import { visiblePlayerIds } from "./players";
import { addDays, academyToday } from "./schedule";

interface PlayerLink {
  businessId: string;
  playerId: string;
}

/** Pemain milik akun ini (satu akun satu pemain). Sumber kebenaran: fungsi SECURITY DEFINER. */
async function playerLink(userId: string): Promise<PlayerLink | null> {
  const [row] = (await withContext(db(), { userId }, (tx) =>
    tx.execute(sql`SELECT business_id AS "businessId", player_id AS "playerId" FROM bola.my_player()`),
  )) as unknown as PlayerLink[];
  return row ?? null;
}

export async function hasPlayerAccount(userId: string): Promise<boolean> {
  return (await playerLink(userId)) !== null;
}

/** QR absensi sekali pakai, berlaku dua menit dan hanya dapat dibuat oleh akun pemainnya. */
export async function createAttendanceQr(session: SessionInfo): Promise<{ token: string; expiresAt: string }> {
  const link = await requireLink(session);
  const { token, hash } = newToken();
  return asPlayer(session, link, async (tx) => {
    await tx.execute(sql`DELETE FROM bola.attendance_qr_tokens WHERE player_id = ${link.playerId}::uuid AND (expires_at <= now() OR consumed_at IS NULL)`);
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.attendance_qr_tokens (business_id, player_id, token_hash, expires_at)
      VALUES (${link.businessId}::uuid, ${link.playerId}::uuid, ${hash}, now() + interval '2 minutes')
      RETURNING to_char(expires_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "expiresAt"`)) as unknown as { expiresAt: string }[];
    return { token, expiresAt: row!.expiresAt };
  });
}

async function requireLink(session: SessionInfo): Promise<PlayerLink> {
  const link = await playerLink(session.userId);
  if (!link) throw notFound("Pemain");
  return link;
}

/** Transaksi di akademi pemain, atas nama akun pemain. Query di dalamnya wajib dibatasi ke `link.playerId`. */
const asPlayer = <T>(session: SessionInfo, link: PlayerLink, work: (tx: Tx) => Promise<T>) =>
  withContext(db(), { userId: session.userId, businessId: link.businessId }, work);

export interface PlayerSession {
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

export interface PlayerHome {
  playerId: string;
  academyName: string;
  fullName: string;
  birthDate: string;
  shirtNumber: number | null;
  position: string | null;
  teamNames: string;
  upcoming: PlayerSession[];
  attendance: {
    rate: number | null;
    counts: Record<AttendanceStatus, number>;
    recent: { date: string; kind: "training" | "match"; status: AttendanceStatus }[];
  };
  invoices: { id: string; period: string; amount: number; status: "unpaid" | "paid" | "waived"; paidOn: string | null }[];
  outstanding: number;
  announcements: { id: string; title: string; body: string; teamName: string | null; createdAt: string }[];
  evaluations: Awaited<ReturnType<typeof evaluationsForPlayer>>;
}

/** Semua yang dilihat pemain di portalnya; null bila akun ini bukan akun pemain. */
export async function playerHome(session: SessionInfo): Promise<PlayerHome | null> {
  const link = await playerLink(session.userId);
  return link ? asPlayer(session, link, (tx) => homeOf(tx, link.playerId)) : null;
}

async function homeOf(tx: Tx, playerId: string): Promise<PlayerHome> {
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
    WHERE p.id = ${playerId}::uuid`)) as unknown as Omit<PlayerHome, "playerId" | "upcoming" | "attendance" | "invoices" | "outstanding" | "announcements" | "evaluations">[];
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
    LIMIT 8`)) as unknown as (Omit<PlayerSession, "notice"> & {
    noticeStatus: "excused" | "sick" | null;
    noticeNote: string | null;
  })[];

  const recent = (await tx.execute(sql`
    SELECT to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date, s.kind, a.status
    FROM bola.attendance a
    JOIN bola.sessions s ON s.id = a.session_id
    JOIN core.businesses b ON b.id = s.business_id
    WHERE a.player_id = ${playerId}::uuid AND s.starts_at > now() - interval '60 days'
    ORDER BY s.starts_at DESC`)) as unknown as PlayerHome["attendance"]["recent"];

  const invoices = (await tx.execute(sql`
    SELECT i.id, to_char(i.period, 'YYYY-MM') AS period, i.amount, i.status,
           to_char(i.paid_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "paidOn"
    FROM bola.invoices i JOIN core.businesses b ON b.id = i.business_id
    WHERE i.player_id = ${playerId}::uuid
    ORDER BY i.period DESC
    LIMIT 6`)) as unknown as PlayerHome["invoices"];

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
    announcements: await announcementsForPlayer(tx, playerId),
    evaluations: await evaluationsForPlayer(tx, playerId),
  };
}

/** Pemain memberi tahu izin/sakit untuk satu sesi yang belum mulai. */
export async function submitNotice(session: SessionInfo, input: z.infer<typeof NoticeInput>): Promise<void> {
  const link = await requireLink(session);
  await asPlayer(session, link, async (tx) => {
    await assertNotifiable(tx, input.sessionId, link.playerId);
    await tx.execute(sql`
      INSERT INTO bola.absence_notices (business_id, session_id, player_id, status, note, created_by)
      VALUES (${link.businessId}::uuid, ${input.sessionId}::uuid, ${link.playerId}::uuid,
              ${input.status}, ${input.note || null}, ${session.userId}::uuid)
      ON CONFLICT (session_id, player_id)
      DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, created_by = EXCLUDED.created_by, created_at = now()`);
    await tx.insert(auditEvents).values({
      businessId: link.businessId,
      actorUserId: session.userId,
      action: "absence_notice.submitted",
      targetType: "session",
      targetId: input.sessionId,
      meta: { playerId: link.playerId, status: input.status },
    });
  });
}

export async function cancelNotice(session: SessionInfo, sessionId: string): Promise<void> {
  const link = await requireLink(session);
  await asPlayer(session, link, async (tx) => {
    await assertNotifiable(tx, sessionId, link.playerId);
    await tx.execute(sql`
      DELETE FROM bola.absence_notices WHERE session_id = ${sessionId}::uuid AND player_id = ${link.playerId}::uuid`);
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

export interface MyPlayerInvitation {
  id: string;
  academyName: string;
  playerName: string;
  birthDate: string;
  invitedByName: string | null;
}

export async function myPlayerInvitations(userId: string): Promise<MyPlayerInvitation[]> {
  // Berisi nama dan tanggal lahir anak: hanya untuk pemilik email yang sudah terbukti.
  if (!(await isEmailVerified(db(), userId))) return [];
  return (await withContext(db(), { userId }, (tx) =>
    tx.execute(sql`
      SELECT id, academy_name AS "academyName", player_name AS "playerName",
             to_char(birth_date, 'YYYY-MM-DD') AS "birthDate", invited_by_name AS "invitedByName"
      FROM bola.my_player_invitations()`),
  )) as unknown as MyPlayerInvitation[];
}

/** `consentBy`: nama orang tua/wali yang menyetujui, atau nama pemain sendiri bila sudah dewasa. */
export async function acceptPlayerInvitation(session: SessionInfo, invitationId: string, consentBy: string): Promise<string> {
  if (!(await isEmailVerified(db(), session.userId))) throw unverifiedEmail();
  if (await hasPlayerAccount(session.userId)) {
    throw new AppError(409, "has_player", "Akun ini sudah terhubung ke pemain lain. Satu pemain memakai satu akun.");
  }
  const [row] = (await withContext(db(), { userId: session.userId }, (tx) =>
    tx.execute(sql`SELECT bola.accept_player_invitation(${invitationId}::uuid, ${consentBy}) AS id`),
  )) as unknown as { id: string | null }[];
  if (!row?.id) throw notFound("Undangan");
  return row.id;
}

/* ---------- Sisi staf: akun pemain untuk satu pemain ---------- */

export interface PlayerAccountInfo {
  account: { name: string; email: string; since: string } | null;
  pending: { id: string; email: string; expiresAt: string } | null;
}

async function assertAccountAdmin(ctx: AcademyContext, tx: Tx, playerId: string) {
  requirePermission(ctx, "players.manage");
  const scope = await visiblePlayerIds(ctx, tx);
  if (scope && !scope.includes(playerId)) throw notFound("Pemain");
}

export function playerAccount(ctx: AcademyContext, playerId: string): Promise<PlayerAccountInfo> {
  return inAcademy(ctx, async (tx) => {
    await assertAccountAdmin(ctx, tx, playerId);
    const [account] = (await tx.execute(sql`
      SELECT u.name, u.email, to_char(a.created_at, 'YYYY-MM-DD') AS since
      FROM bola.player_accounts a JOIN core.users u ON u.id = a.user_id
      WHERE a.player_id = ${playerId}::uuid`)) as unknown as NonNullable<PlayerAccountInfo["account"]>[];
    const [pending] = (await tx.execute(sql`
      SELECT id, email, to_char(expires_at, 'YYYY-MM-DD') AS "expiresAt" FROM bola.player_invitations
      WHERE player_id = ${playerId}::uuid AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`)) as unknown as NonNullable<
      PlayerAccountInfo["pending"]
    >[];
    return { account: account ?? null, pending: pending ?? null };
  });
}

/** Mengundang email untuk menjadi akun pemain ini. Undangan lama yang belum diterima diganti. */
export async function invitePlayerAccount(ctx: AcademyContext, playerId: string, email: string): Promise<void> {
  const { academyName, playerName } = await inAcademy(ctx, async (tx) => {
    await assertAccountAdmin(ctx, tx, playerId);
    const [linked] = (await tx.execute(sql`
      SELECT 1 FROM bola.player_accounts WHERE player_id = ${playerId}::uuid`)) as unknown as unknown[];
    if (linked) throw new AppError(409, "has_account", "Pemain ini sudah punya akun. Putuskan dulu bila ingin mengganti.");
    await tx.execute(sql`
      UPDATE bola.player_invitations SET revoked_at = now()
      WHERE player_id = ${playerId}::uuid AND accepted_at IS NULL AND revoked_at IS NULL`);
    await tx.execute(sql`
      INSERT INTO bola.player_invitations (business_id, player_id, email, invited_by)
      VALUES (${ctx.businessId}::uuid, ${playerId}::uuid, ${email}, ${ctx.userId}::uuid)`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "player_account.invited",
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
    await sendPlayerInvite(email, academyName, playerName);
  } catch (error) {
    // Undangan tetap sah; bisa dibuka dari /undangan setelah masuk.
    console.error("gagal mengirim email undangan akun pemain", error);
  }
}

export async function revokePlayerInvitation(ctx: AcademyContext, playerId: string): Promise<void> {
  await inAcademy(ctx, async (tx) => {
    await assertAccountAdmin(ctx, tx, playerId);
    await tx.execute(sql`
      UPDATE bola.player_invitations SET revoked_at = now()
      WHERE player_id = ${playerId}::uuid AND accepted_at IS NULL AND revoked_at IS NULL`);
  });
}

export async function unlinkPlayerAccount(ctx: AcademyContext, playerId: string): Promise<void> {
  await inAcademy(ctx, async (tx) => {
    await assertAccountAdmin(ctx, tx, playerId);
    await tx.execute(sql`DELETE FROM bola.player_accounts WHERE player_id = ${playerId}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "player_account.unlinked",
      targetType: "player",
      targetId: playerId,
    });
  });
}
