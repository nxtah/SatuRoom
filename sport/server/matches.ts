import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { MatchInput } from "@/lib/schemas";
import { inAcademy, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { assertTeamAccess, getSession, academyToday, uuidList, type SessionRow } from "./schedule";
import { visibleTeamIds } from "./teams";

export type HomeAway = "home" | "away" | "neutral";
export type LineupRole = "starter" | "bench";
import { resultOf, type MatchResult } from "./matches-shared";
export type { MatchResult };

export interface MatchDetail {
  opponent: string | null;
  homeAway: HomeAway;
  scoreUs: number | null;
  scoreThem: number | null;
  report: string | null;
}

export interface MatchRosterEntry {
  playerId: string;
  fullName: string;
  shirtNumber: number | null;
  position: string | null;
  role: LineupRole | null;
  /** Status absensi sesi ini, bila sudah diisi. */
  attendance: "present" | "excused" | "sick" | "absent" | null;
}

export interface MatchView {
  session: SessionRow;
  detail: MatchDetail;
  roster: MatchRosterEntry[];
  canEdit: boolean;
}

export { resultOf };

/** Detail dan susunan pemain sebuah pertandingan. Sesi latihan diperlakukan seperti tidak ada. */
export function getMatch(ctx: AcademyContext, sessionId: string): Promise<MatchView> {
  return inAcademy(ctx, async (tx) => {
    const session = await getSession(ctx, sessionId, tx);
    if (session.kind !== "match") throw notFound("Pertandingan");
    const [d] = (await tx.execute(sql`
      SELECT opponent, home_away AS "homeAway", score_us AS "scoreUs", score_them AS "scoreThem", report
      FROM bola.match_details WHERE session_id = ${sessionId}::uuid`)) as unknown as MatchDetail[];
    const roster = (await tx.execute(sql`
      SELECT p.id AS "playerId", p.full_name AS "fullName", p.shirt_number AS "shirtNumber", p.position,
             l.role, a.status AS attendance
      FROM bola.players p
      LEFT JOIN bola.match_lineup l ON l.player_id = p.id AND l.session_id = ${sessionId}::uuid
      LEFT JOIN bola.attendance a ON a.player_id = p.id AND a.session_id = ${sessionId}::uuid
      WHERE l.session_id IS NOT NULL
         OR (p.status = 'active' AND EXISTS (
              SELECT 1 FROM bola.team_players tp WHERE tp.player_id = p.id AND tp.team_id = ${session.teamId}::uuid))
      ORDER BY (l.role = 'starter') DESC NULLS LAST, p.shirt_number NULLS LAST, p.full_name`)) as unknown as MatchRosterEntry[];
    const scope = await visibleTeamIds(ctx, tx);
    const canEdit = (!scope || scope.includes(session.teamId)) && (ctx.can("schedule.manage_all") || scope !== null);
    return {
      session,
      detail: d ?? { opponent: null, homeAway: "home", scoreUs: null, scoreThem: null, report: null },
      roster,
      canEdit,
    };
  });
}

/** Menyimpan lawan, skor, catatan, dan susunan pemain sekaligus. Susunan lama diganti seluruhnya. */
export async function saveMatch(ctx: AcademyContext, sessionId: string, input: z.infer<typeof MatchInput>): Promise<void> {
  const view = await getMatch(ctx, sessionId);
  await inAcademy(ctx, async (tx) => {
    await assertTeamAccess(ctx, tx, view.session.teamId, "manage");
    if (view.session.status === "cancelled") throw new AppError(409, "cancelled", "Pertandingan ini dibatalkan.");
    const ids = input.lineup.map((l) => l.playerId);
    if (new Set(ids).size !== ids.length) throw new AppError(422, "invalid", "Satu pemain hanya boleh muncul sekali di susunan.");
    const allowed = new Set(view.roster.map((r) => r.playerId));
    if (ids.some((id) => !allowed.has(id))) {
      throw new AppError(422, "invalid", "Ada pemain yang bukan anggota tim ini. Muat ulang halaman.");
    }
    await tx.execute(sql`
      INSERT INTO bola.match_details (session_id, business_id, opponent, home_away, score_us, score_them, report, updated_by, updated_at)
      VALUES (${sessionId}::uuid, ${ctx.businessId}::uuid, ${input.opponent}, ${input.homeAway}::bola.home_away,
              ${input.scoreUs}::smallint, ${input.scoreThem}::smallint, ${input.report}, ${ctx.userId}::uuid, now())
      ON CONFLICT (session_id) DO UPDATE SET opponent = excluded.opponent, home_away = excluded.home_away,
        score_us = excluded.score_us, score_them = excluded.score_them, report = excluded.report,
        updated_by = excluded.updated_by, updated_at = now()`);
    await tx.execute(sql`DELETE FROM bola.match_lineup WHERE session_id = ${sessionId}::uuid`);
    for (const l of input.lineup) {
      await tx.execute(sql`
        INSERT INTO bola.match_lineup (business_id, session_id, player_id, role)
        VALUES (${ctx.businessId}::uuid, ${sessionId}::uuid, ${l.playerId}::uuid, ${l.role}::bola.lineup_role)`);
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "match.saved",
      targetType: "session",
      targetId: sessionId,
      meta: { lineup: input.lineup.length, scored: input.scoreUs !== null },
    });
  });
}

export interface ResultRow {
  sessionId: string;
  date: string;
  teamName: string;
  opponent: string | null;
  homeAway: HomeAway;
  scoreUs: number;
  scoreThem: number;
  result: MatchResult;
}

export interface NextMatch {
  sessionId: string;
  date: string;
  startTime: string;
  teamName: string;
  opponent: string | null;
  homeAway: HomeAway;
  locationName: string;
}

export interface MatchesOverview {
  record: { w: number; d: number; l: number; goalsFor: number; goalsAgainst: number };
  /** Hasil terbaru lebih dulu. */
  recent: ResultRow[];
  next: NextMatch | null;
}

/** Ringkasan pertandingan untuk Beranda: rekor, hasil terbaru, dan pertandingan berikutnya (sesuai cakupan peminta). */
export function matchesOverview(ctx: AcademyContext, limit = 5): Promise<MatchesOverview> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    if (scope && scope.length === 0) return { record: { w: 0, d: 0, l: 0, goalsFor: 0, goalsAgainst: 0 }, recent: [], next: null };
    const filter = scope ? sql`AND s.team_id IN (${uuidList(scope)})` : sql``;
    const today = await academyToday(tx);
    const rows = (await tx.execute(sql`
      SELECT s.id AS "sessionId", to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date,
             t.name AS "teamName", m.opponent, m.home_away AS "homeAway",
             m.score_us AS "scoreUs", m.score_them AS "scoreThem"
      FROM bola.sessions s
      JOIN bola.match_details m ON m.session_id = s.id AND m.score_us IS NOT NULL
      JOIN bola.teams t ON t.id = s.team_id
      JOIN core.businesses b ON b.id = s.business_id
      WHERE s.kind = 'match' AND s.status = 'scheduled' ${filter}
      ORDER BY s.starts_at DESC LIMIT 200`)) as unknown as Omit<ResultRow, "result">[];
    const all = rows.map((r) => ({ ...r, result: resultOf(r.scoreUs, r.scoreThem)! }));
    const record = {
      w: all.filter((r) => r.result === "W").length,
      d: all.filter((r) => r.result === "D").length,
      l: all.filter((r) => r.result === "L").length,
      goalsFor: all.reduce((n, r) => n + r.scoreUs, 0),
      goalsAgainst: all.reduce((n, r) => n + r.scoreThem, 0),
    };
    const [next] = (await tx.execute(sql`
      SELECT s.id AS "sessionId", to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date,
             to_char(s.starts_at AT TIME ZONE b.timezone, 'HH24:MI') AS "startTime",
             t.name AS "teamName", m.opponent, coalesce(m.home_away, 'home') AS "homeAway", l.name AS "locationName"
      FROM bola.sessions s
      JOIN bola.teams t ON t.id = s.team_id AND t.archived_at IS NULL
      JOIN bola.locations l ON l.id = s.location_id
      JOIN core.businesses b ON b.id = s.business_id
      LEFT JOIN bola.match_details m ON m.session_id = s.id
      WHERE s.kind = 'match' AND s.status = 'scheduled' AND s.ends_at > now()
        AND (s.starts_at AT TIME ZONE b.timezone)::date >= ${today}::date ${filter}
      ORDER BY s.starts_at LIMIT 1`)) as unknown as NextMatch[];
    return { record, recent: all.slice(0, limit), next: next ?? null };
  });
}
