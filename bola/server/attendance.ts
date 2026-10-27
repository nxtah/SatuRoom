import "server-only";
import { tokenHash } from "@saturoom/core/crypto";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { AttendanceInput, AttendanceStatus } from "@/lib/schemas";
import { inAcademy, type AcademyContext } from "./context";
import { AppError } from "./errors";
import { attendance } from "./schema";
import { academyToday, assertTeamAccess, getSession, uuidList, type SessionRow } from "./schedule";
import { visibleTeamIds } from "./teams";

/** Berapa kali alpa berturut-turut sebelum pemain masuk daftar "perlu perhatian". */
export const ABSENT_STREAK = 3;

export interface RosterEntry {
  playerId: string;
  fullName: string;
  shirtNumber: number | null;
  status: AttendanceStatus | null;
  /** Izin/sakit yang dikirim pemain lewat akunnya sebelum latihan. */
  notice: { status: "excused" | "sick"; note: string | null } | null;
}

export interface SessionSheet {
  session: SessionRow;
  roster: RosterEntry[];
  /** Boleh mengisi absensi sekarang. */
  canRecord: boolean;
  /** Alasan bila belum/tidak bisa diisi. */
  blockedReason: string | null;
  canManage: boolean;
}

/**
 * Lembar absensi: pemain aktif tim saat ini, ditambah pemain yang sudah tercatat di sesi ini
 * (agar riwayat tetap utuh walau pemain pindah tim atau dinonaktifkan).
 */
export function getSessionSheet(ctx: AcademyContext, sessionId: string): Promise<SessionSheet> {
  return inAcademy(ctx, async (tx) => {
    const session = await getSession(ctx, sessionId, tx);
    const rows = (await tx.execute(sql`
      SELECT p.id AS "playerId", p.full_name AS "fullName", p.shirt_number AS "shirtNumber", a.status,
             n.status AS "noticeStatus", n.note AS "noticeNote"
      FROM bola.players p
      LEFT JOIN bola.attendance a ON a.player_id = p.id AND a.session_id = ${sessionId}::uuid
      LEFT JOIN bola.absence_notices n ON n.player_id = p.id AND n.session_id = ${sessionId}::uuid
      WHERE a.session_id IS NOT NULL
         OR (p.status = 'active' AND EXISTS (
              SELECT 1 FROM bola.team_players tp WHERE tp.player_id = p.id AND tp.team_id = ${session.teamId}::uuid))
      ORDER BY p.full_name`)) as unknown as (Omit<RosterEntry, "notice"> & {
      noticeStatus: "excused" | "sick" | null;
      noticeNote: string | null;
    })[];
    const roster = rows.map(({ noticeStatus, noticeNote, ...r }) => ({
      ...r,
      notice: noticeStatus ? { status: noticeStatus, note: noticeNote } : null,
    }));
    const scope = await visibleTeamIds(ctx, tx);
    const inScope = !scope || scope.includes(session.teamId);
    const canRecordRole = inScope && (ctx.can("attendance.record_all") || scope !== null);
    const canManage = inScope && (ctx.can("schedule.manage_all") || scope !== null);
    const today = await academyToday(tx);
    const blockedReason =
      session.status === "cancelled"
        ? "Sesi ini dibatalkan."
        : session.date > today
          ? "Absensi bisa diisi mulai hari latihan."
          : null;
    return { session, roster, canRecord: canRecordRole && !blockedReason, blockedReason, canManage };
  });
}

export async function saveAttendance(
  ctx: AcademyContext,
  sessionId: string,
  input: z.infer<typeof AttendanceInput>,
): Promise<{ saved: number }> {
  const sheet = await getSessionSheet(ctx, sessionId);
  return inAcademy(ctx, async (tx) => {
    await assertTeamAccess(ctx, tx, sheet.session.teamId, "record");
    if (!sheet.canRecord) throw new AppError(409, "not_open", sheet.blockedReason ?? "Absensi belum bisa diisi.");
    const allowed = new Set(sheet.roster.map((r) => r.playerId));
    const entries = new Map(input.entries.map((e) => [e.playerId, e.status]));
    for (const id of entries.keys()) {
      if (!allowed.has(id)) {
        throw new AppError(422, "invalid", "Ada pemain yang bukan anggota tim ini. Muat ulang halaman.");
      }
    }
    await tx
      .insert(attendance)
      .values(
        [...entries].map(([playerId, status]) => ({
          businessId: ctx.businessId,
          sessionId,
          playerId,
          status,
          recordedBy: ctx.userId,
        })),
      )
      .onConflictDoUpdate({
        target: [attendance.sessionId, attendance.playerId],
        set: { status: sql`excluded.status`, recordedBy: ctx.userId, recordedAt: sql`now()` },
      });
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "attendance.recorded",
      targetType: "session",
      targetId: sessionId,
      meta: { count: entries.size },
    });
    return { saved: entries.size };
  });
}

/** Memakai QR pemain untuk menandai hadir pada sesi yang sedang dibuka pelatih. */
export async function scanAttendanceQr(ctx: AcademyContext, sessionId: string, token: string): Promise<{ playerId: string; fullName: string }> {
  const sheet = await getSessionSheet(ctx, sessionId);
  return inAcademy(ctx, async (tx) => {
    await assertTeamAccess(ctx, tx, sheet.session.teamId, "record");
    if (!sheet.canRecord) throw new AppError(409, "not_open", sheet.blockedReason ?? "Absensi belum bisa diisi.");
    const [row] = (await tx.execute(sql`
      SELECT q.id, p.id AS "playerId", p.full_name AS "fullName"
      FROM bola.attendance_qr_tokens q
      JOIN bola.players p ON p.id = q.player_id
      JOIN bola.team_players tp ON tp.player_id = p.id AND tp.team_id = ${sheet.session.teamId}::uuid
      WHERE q.token_hash = ${tokenHash(token)} AND q.expires_at > now() AND q.consumed_at IS NULL
        AND p.status = 'active'
      FOR UPDATE OF q`)) as unknown as { id: string; playerId: string; fullName: string }[];
    if (!row) throw new AppError(404, "invalid_qr", "QR tidak valid atau sudah kedaluwarsa.");
    await tx.execute(sql`
      INSERT INTO bola.attendance (business_id, session_id, player_id, status, recorded_by)
      VALUES (${ctx.businessId}::uuid, ${sessionId}::uuid, ${row.playerId}::uuid, 'present', ${ctx.userId}::uuid)
      ON CONFLICT (session_id, player_id) DO UPDATE SET status = 'present', recorded_by = EXCLUDED.recorded_by, recorded_at = now()`);
    await tx.execute(sql`UPDATE bola.attendance_qr_tokens SET consumed_at = now(), consumed_by = ${ctx.userId}::uuid WHERE id = ${row.id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "attendance.qr_scanned", targetType: "session", targetId: sessionId, meta: { playerId: row.playerId } });
    return { playerId: row.playerId, fullName: row.fullName };
  });
}

export interface PlayerAttendance {
  recent: { sessionId: string; date: string; teamName: string; status: AttendanceStatus }[];
  /** Persentase hadir dari sesi tercatat dalam 60 hari terakhir; null bila belum ada data. */
  rate: number | null;
  recorded: number;
}

/**
 * Riwayat kehadiran pemain. Pemanggil sudah memastikan pemain dalam cakupan (lewat getPlayer);
 * pelatih hanya melihat sesi tim yang dia pegang.
 */
export function playerAttendance(ctx: AcademyContext, playerId: string): Promise<PlayerAttendance> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    const inScope = scope ? sql`AND s.team_id IN (${scope.length ? uuidList(scope) : sql`NULL`})` : sql``;
    const recent = (await tx.execute(sql`
      SELECT s.id AS "sessionId", to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date,
             t.name AS "teamName", a.status
      FROM bola.attendance a
      JOIN bola.sessions s ON s.id = a.session_id
      JOIN bola.teams t ON t.id = s.team_id
      JOIN core.businesses b ON b.id = s.business_id
      WHERE a.player_id = ${playerId}::uuid ${inScope}
      ORDER BY s.starts_at DESC LIMIT 12`)) as unknown as PlayerAttendance["recent"];
    const [stats] = (await tx.execute(sql`
      SELECT count(*)::int AS recorded, count(*) FILTER (WHERE a.status = 'present')::int AS present
      FROM bola.attendance a JOIN bola.sessions s ON s.id = a.session_id
      WHERE a.player_id = ${playerId}::uuid AND s.starts_at > now() - interval '60 days' ${inScope}`)) as unknown as {
      recorded: number;
      present: number;
    }[];
    const recorded = stats?.recorded ?? 0;
    return { recent, recorded, rate: recorded ? Math.round(((stats?.present ?? 0) / recorded) * 100) : null };
  });
}

export interface AttentionItem {
  playerId: string;
  fullName: string;
  teamNames: string;
  streak: number;
}

/** Pemain aktif yang alpa (tanpa keterangan) di beberapa sesi tercatat terakhirnya secara berturut-turut. */
export function needsAttention(ctx: AcademyContext): Promise<AttentionItem[]> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    if (scope && scope.length === 0) return [];
    return (await tx.execute(sql`
      WITH ranked AS (
        SELECT a.player_id, a.status,
               row_number() OVER (PARTITION BY a.player_id ORDER BY s.starts_at DESC) AS n
        FROM bola.attendance a JOIN bola.sessions s ON s.id = a.session_id
        ${scope ? sql`WHERE s.team_id IN (${uuidList(scope)})` : sql``}
      ), streaks AS (
        SELECT player_id, count(*)::int AS streak
        FROM ranked r
        WHERE r.status = 'absent'
          AND NOT EXISTS (SELECT 1 FROM ranked x WHERE x.player_id = r.player_id AND x.n <= r.n AND x.status <> 'absent')
        GROUP BY player_id
      )
      SELECT p.id AS "playerId", p.full_name AS "fullName", st.streak,
             coalesce((SELECT string_agg(t.name, ', ' ORDER BY t.name) FROM bola.team_players tp
                        JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
                        WHERE tp.player_id = p.id), '') AS "teamNames"
      FROM streaks st JOIN bola.players p ON p.id = st.player_id
      WHERE p.status = 'active' AND st.streak >= ${ABSENT_STREAK}
      ORDER BY st.streak DESC, p.full_name
      LIMIT 20`)) as unknown as AttentionItem[];
  });
}
