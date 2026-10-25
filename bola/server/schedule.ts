import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { and, eq, gt, isNull, notExists, sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import type { CancelInput, ScheduleInput, SessionInput } from "@/lib/schemas";
import { inAcademy, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { attendance, locations, schedules, sessions, teams } from "./schema";
import { visibleTeamIds } from "./teams";

/** Berapa hari ke depan sesi dibuat dari jadwal rutin saat jadwal disimpan. */
const GENERATE_AHEAD_DAYS = 56;
/** Batas jauh ke depan yang boleh dibuka di kalender (mencegah pembuatan sesi tanpa batas). */
const MAX_AHEAD_DAYS = 180;

export const uuidList = (ids: string[]): SQL => sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `);

/** Tanggal hari ini (YYYY-MM-DD) di zona waktu akademi. */
export async function academyToday(tx: Tx): Promise<string> {
  const [row] = (await tx.execute(
    sql`SELECT to_char((now() AT TIME ZONE timezone)::date, 'YYYY-MM-DD') AS d
        FROM core.businesses WHERE id = core.current_business_id()`,
  )) as unknown as { d: string }[];
  if (!row) throw notFound("Akademi");
  return row.d;
}

export const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Senin dari minggu yang memuat tanggal `iso`. */
export const mondayOf = (iso: string): string => {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay() || 7;
  return addDays(iso, 1 - day);
};

async function generate(tx: Tx, from: string, to: string) {
  await tx.execute(sql`SELECT bola.generate_sessions(${from}::date, ${to}::date)`);
}

/**
 * Pengelola jadwal tim: peran dengan `schedule.manage_all`, atau pelatih yang ditugaskan ke tim itu.
 * Tim di luar cakupan diperlakukan seperti tidak ada.
 */
async function assertTeamAccess(ctx: AcademyContext, tx: Tx, teamId: string, need: "manage" | "record") {
  const scope = await visibleTeamIds(ctx, tx);
  const [team] = await tx
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), isNull(teams.archivedAt)));
  if (!team || (scope && !scope.includes(teamId))) throw notFound("Tim");
  const all = need === "manage" ? ctx.can("schedule.manage_all") : ctx.can("attendance.record_all");
  // Pelatih (tanpa izin "_all") boleh mengelola tim yang ditugaskan kepadanya.
  if (!all && !scope) throw forbidden();
}

async function primaryLocation(tx: Tx): Promise<string> {
  const [loc] = await tx
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.isPrimary, true), isNull(locations.archivedAt)));
  if (!loc) throw new AppError(409, "no_location", "Lokasi utama akademi belum ada.");
  return loc.id;
}

// ---------- Jadwal rutin ----------

export interface ScheduleRow {
  id: string;
  teamId: string;
  teamName: string;
  weekday: number;
  startTime: string;
  durationMin: number;
  startsOn: string;
}

export function listSchedules(ctx: AcademyContext): Promise<ScheduleRow[]> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    if (scope && scope.length === 0) return [];
    const today = await academyToday(tx);
    return (await tx.execute(sql`
      SELECT s.id, s.team_id AS "teamId", t.name AS "teamName", s.weekday,
             to_char(s.start_time, 'HH24:MI') AS "startTime", s.duration_min AS "durationMin",
             to_char(s.starts_on, 'YYYY-MM-DD') AS "startsOn"
      FROM bola.schedules s JOIN bola.teams t ON t.id = s.team_id AND t.archived_at IS NULL
      WHERE (s.ends_on IS NULL OR s.ends_on >= ${today}::date)
        ${scope ? sql`AND s.team_id IN (${uuidList(scope)})` : sql``}
      ORDER BY t.name, s.weekday, s.start_time
    `)) as unknown as ScheduleRow[];
  });
}

export async function createSchedule(ctx: AcademyContext, input: z.infer<typeof ScheduleInput>): Promise<string[]> {
  return inAcademy(ctx, async (tx) => {
    await assertTeamAccess(ctx, tx, input.teamId, "manage");
    const today = await academyToday(tx);
    if (input.startsOn < addDays(today, -7)) {
      throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", {
        startsOn: "Tanggal mulai paling lambat 7 hari yang lalu.",
      });
    }
    const locationId = await primaryLocation(tx);
    const rows = await tx
      .insert(schedules)
      .values(
        [...new Set(input.weekdays)].map((weekday) => ({
          businessId: ctx.businessId,
          teamId: input.teamId,
          locationId,
          weekday,
          startTime: input.startTime,
          durationMin: input.durationMin,
          startsOn: input.startsOn,
          createdBy: ctx.userId,
        })),
      )
      .returning({ id: schedules.id });
    await generate(tx, input.startsOn, addDays(today, GENERATE_AHEAD_DAYS));
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "schedule.created",
      targetType: "team",
      targetId: input.teamId,
    });
    return rows.map((r) => r.id);
  });
}

/**
 * Menghentikan jadwal rutin mulai hari ini. Sesi mendatang yang belum diabsen dihapus;
 * sesi yang sudah lewat atau sudah ada absensinya tetap tersimpan.
 */
export async function stopSchedule(ctx: AcademyContext, id: string): Promise<void> {
  await inAcademy(ctx, async (tx) => {
    const [row] = await tx.select({ teamId: schedules.teamId }).from(schedules).where(eq(schedules.id, id));
    if (!row) throw notFound("Jadwal");
    await assertTeamAccess(ctx, tx, row.teamId, "manage");
    const today = await academyToday(tx);
    await tx.update(schedules).set({ endsOn: addDays(today, -1) }).where(eq(schedules.id, id));
    await tx
      .delete(sessions)
      .where(
        and(
          eq(sessions.scheduleId, id),
          gt(sessions.startsAt, sql`now()`),
          notExists(tx.select({ x: sql`1` }).from(attendance).where(eq(attendance.sessionId, sessions.id))),
        ),
      );
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "schedule.stopped",
      targetType: "team",
      targetId: row.teamId,
    });
  });
}

// ---------- Sesi ----------

export interface SessionRow {
  id: string;
  teamId: string;
  teamName: string;
  kind: "training" | "match";
  title: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "cancelled";
  cancelReason: string | null;
  locationName: string;
  /** Pemain aktif tim saat ini. */
  rosterCount: number;
  recordedCount: number;
  presentCount: number;
}

function sessionQuery(where: SQL): SQL {
  return sql`
    SELECT s.id, s.team_id AS "teamId", t.name AS "teamName", s.kind, s.title,
           to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date,
           to_char(s.starts_at AT TIME ZONE b.timezone, 'HH24:MI') AS "startTime",
           to_char(s.ends_at AT TIME ZONE b.timezone, 'HH24:MI') AS "endTime",
           s.status, s.cancel_reason AS "cancelReason", l.name AS "locationName",
           (SELECT count(*)::int FROM bola.team_players tp JOIN bola.players p ON p.id = tp.player_id
             WHERE tp.team_id = s.team_id AND p.status = 'active') AS "rosterCount",
           (SELECT count(*)::int FROM bola.attendance a WHERE a.session_id = s.id) AS "recordedCount",
           (SELECT count(*)::int FROM bola.attendance a WHERE a.session_id = s.id AND a.status = 'present') AS "presentCount"
    FROM bola.sessions s
    JOIN bola.teams t ON t.id = s.team_id
    JOIN bola.locations l ON l.id = s.location_id
    JOIN core.businesses b ON b.id = s.business_id
    WHERE ${where}
    ORDER BY s.starts_at, t.name`;
}

/** Sesi dalam rentang tanggal lokal [from, to], setelah sesi dari jadwal rutin dibuat. */
export function listSessions(
  ctx: AcademyContext,
  range: { from: string; to: string; teamId?: string },
): Promise<SessionRow[]> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    if (scope && scope.length === 0) return [];
    const today = await academyToday(tx);
    const to = range.to > addDays(today, MAX_AHEAD_DAYS) ? addDays(today, MAX_AHEAD_DAYS) : range.to;
    if (to < range.from) return [];
    await generate(tx, range.from, to);
    return (await tx.execute(
      sessionQuery(sql`
        s.starts_at >= (${range.from}::date)::timestamp AT TIME ZONE b.timezone
        AND s.starts_at < (${to}::date + 1)::timestamp AT TIME ZONE b.timezone
        AND t.archived_at IS NULL
        ${scope ? sql`AND s.team_id IN (${uuidList(scope)})` : sql``}
        ${range.teamId ? sql`AND s.team_id = ${range.teamId}::uuid` : sql``}`),
    )) as unknown as SessionRow[];
  });
}

export async function todaySessions(ctx: AcademyContext): Promise<{ today: string; sessions: SessionRow[] }> {
  const today = await inAcademy(ctx, academyToday);
  return { today, sessions: await listSessions(ctx, { from: today, to: today }) };
}

export async function getSession(ctx: AcademyContext, id: string, tx?: Tx): Promise<SessionRow> {
  const run = async (t: Tx) => {
    const scope = await visibleTeamIds(ctx, t);
    const [row] = (await t.execute(sessionQuery(sql`s.id = ${id}::uuid`))) as unknown as SessionRow[];
    if (!row || (scope && !scope.includes(row.teamId))) throw notFound("Sesi");
    return row;
  };
  return tx ? run(tx) : inAcademy(ctx, run);
}

/** Sesi tambahan di luar jadwal rutin (latihan tambahan atau pertandingan). */
export async function createSession(ctx: AcademyContext, input: z.infer<typeof SessionInput>): Promise<string> {
  return inAcademy(ctx, async (tx) => {
    await assertTeamAccess(ctx, tx, input.teamId, "manage");
    const locationId = await primaryLocation(tx);
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.sessions (business_id, team_id, location_id, kind, title, starts_at, ends_at)
      SELECT ${ctx.businessId}::uuid, ${input.teamId}::uuid, ${locationId}::uuid, ${input.kind}::bola.session_kind,
             ${input.title ?? null},
             (${input.date}::date + ${input.startTime}::time) AT TIME ZONE b.timezone,
             (${input.date}::date + ${input.startTime}::time) AT TIME ZONE b.timezone + make_interval(mins => ${input.durationMin}::int)
      FROM core.businesses b WHERE b.id = ${ctx.businessId}::uuid
      RETURNING id`)) as unknown as { id: string }[];
    if (!row) throw notFound("Akademi");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "session.created",
      targetType: "session",
      targetId: row.id,
    });
    return row.id;
  });
}

export async function setSessionCancelled(
  ctx: AcademyContext,
  id: string,
  cancelled: boolean,
  input: z.infer<typeof CancelInput> = {},
): Promise<void> {
  await inAcademy(ctx, async (tx) => {
    const s = await getSession(ctx, id, tx);
    await assertTeamAccess(ctx, tx, s.teamId, "manage");
    await tx
      .update(sessions)
      .set(cancelled ? { status: "cancelled", cancelReason: input.reason ?? null } : { status: "scheduled", cancelReason: null })
      .where(eq(sessions.id, id));
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: cancelled ? "session.cancelled" : "session.restored",
      targetType: "session",
      targetId: id,
    });
  });
}

export { assertTeamAccess };

/** Boleh membuat jadwal/sesi untuk minimal satu tim (izin semua tim, atau pelatih yang memegang tim). */
export function canPlan(ctx: AcademyContext, visibleTeams: number): boolean {
  return visibleTeams > 0 && (ctx.can("schedule.manage_all") || !ctx.can("teams.read_all"));
}
