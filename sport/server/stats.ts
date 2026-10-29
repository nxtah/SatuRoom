import "server-only";
import { sql } from "drizzle-orm";
import { inAcademy, type AcademyContext } from "./context";
import { addDays, academyToday, mondayOf, uuidList } from "./schedule";
import { visibleTeamIds } from "./teams";

export interface HomeStats {
  activePlayers: number;
  newPlayersThisMonth: number;
  /** Persentase hadir dari absensi tercatat 30 hari terakhir; null bila belum ada data. */
  attendanceRate: number | null;
  sessionsThisWeek: number;
  sessionsRecordedThisWeek: number;
  /** 6 minggu terakhir, lama ke baru. `rate` null bila minggu itu belum ada absensi. */
  weekly: { weekStart: string; rate: number | null; recorded: number }[];
  perTeam: { teamId: string; teamName: string; rate: number | null; players: number }[];
}

const pct = (present: number, recorded: number) => (recorded ? Math.round((present / recorded) * 100) : null);

/** Angka ringkas untuk Beranda, dibatasi ke tim yang boleh dilihat peminta. */
export function homeStats(ctx: AcademyContext): Promise<HomeStats> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    const today = await academyToday(tx);
    const monday = mondayOf(today);
    const firstWeek = addDays(monday, -35);
    const inTeams = (col: string) =>
      scope ? sql`AND ${sql.raw(col)} IN (${scope.length ? uuidList(scope) : sql`NULL`})` : sql``;

    const [players] = (await tx.execute(sql`
      SELECT count(DISTINCT p.id)::int AS active,
             count(DISTINCT p.id) FILTER (WHERE p.created_at >= date_trunc('month', now() AT TIME ZONE b.timezone) AT TIME ZONE b.timezone)::int AS fresh
      FROM bola.players p
      JOIN core.businesses b ON b.id = p.business_id
      ${scope ? sql`JOIN bola.team_players tp ON tp.player_id = p.id ${inTeams("tp.team_id")}` : sql``}
      WHERE p.status = 'active'`)) as unknown as { active: number; fresh: number }[];

    const weekRows = (await tx.execute(sql`
      SELECT to_char(date_trunc('week', s.starts_at AT TIME ZONE b.timezone), 'YYYY-MM-DD') AS week,
             count(*)::int AS recorded, count(*) FILTER (WHERE a.status = 'present')::int AS present
      FROM bola.attendance a
      JOIN bola.sessions s ON s.id = a.session_id
      JOIN core.businesses b ON b.id = s.business_id
      WHERE s.starts_at >= (${firstWeek}::date)::timestamp AT TIME ZONE b.timezone ${inTeams("s.team_id")}
      GROUP BY 1`)) as unknown as { week: string; recorded: number; present: number }[];

    const [last30] = (await tx.execute(sql`
      SELECT count(*)::int AS recorded, count(*) FILTER (WHERE a.status = 'present')::int AS present
      FROM bola.attendance a JOIN bola.sessions s ON s.id = a.session_id
      WHERE s.starts_at > now() - interval '30 days' ${inTeams("s.team_id")}`)) as unknown as {
      recorded: number;
      present: number;
    }[];

    const [week] = (await tx.execute(sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE EXISTS (SELECT 1 FROM bola.attendance a WHERE a.session_id = s.id))::int AS recorded
      FROM bola.sessions s
      JOIN core.businesses b ON b.id = s.business_id
      JOIN bola.teams t ON t.id = s.team_id AND t.archived_at IS NULL
      WHERE s.status = 'scheduled'
        AND s.starts_at >= (${monday}::date)::timestamp AT TIME ZONE b.timezone
        AND s.starts_at < (${addDays(monday, 7)}::date)::timestamp AT TIME ZONE b.timezone
        ${inTeams("s.team_id")}`)) as unknown as { total: number; recorded: number }[];

    const teams = (await tx.execute(sql`
      SELECT t.id AS "teamId", t.name AS "teamName",
             (SELECT count(*)::int FROM bola.team_players tp JOIN bola.players p ON p.id = tp.player_id
               WHERE tp.team_id = t.id AND p.status = 'active') AS players,
             (SELECT count(*)::int FROM bola.attendance a JOIN bola.sessions s ON s.id = a.session_id
               WHERE s.team_id = t.id AND s.starts_at > now() - interval '30 days') AS recorded,
             (SELECT count(*)::int FROM bola.attendance a JOIN bola.sessions s ON s.id = a.session_id
               WHERE s.team_id = t.id AND s.starts_at > now() - interval '30 days' AND a.status = 'present') AS present
      FROM bola.teams t
      WHERE t.archived_at IS NULL ${inTeams("t.id")}
      ORDER BY t.age_min NULLS LAST, t.name`)) as unknown as {
      teamId: string;
      teamName: string;
      players: number;
      recorded: number;
      present: number;
    }[];

    return {
      activePlayers: players?.active ?? 0,
      newPlayersThisMonth: players?.fresh ?? 0,
      attendanceRate: pct(last30?.present ?? 0, last30?.recorded ?? 0),
      sessionsThisWeek: week?.total ?? 0,
      sessionsRecordedThisWeek: week?.recorded ?? 0,
      weekly: Array.from({ length: 6 }, (_, i) => {
        const weekStart = addDays(firstWeek, i * 7);
        const row = weekRows.find((r) => r.week === weekStart);
        return { weekStart, recorded: row?.recorded ?? 0, rate: pct(row?.present ?? 0, row?.recorded ?? 0) };
      }),
      perTeam: teams.map((t) => ({ teamId: t.teamId, teamName: t.teamName, players: t.players, rate: pct(t.present, t.recorded) })),
    };
  });
}
