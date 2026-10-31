import "server-only";
import type { Tx } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError } from "./errors";

/**
 * Analitik dan perbandingan cabang. Pemain dihitung di cabang tim-timnya (tim → lokasi → cabang); pemain di
 * beberapa cabang dihitung di masing-masing cabang. Uang iuran ikut cabang pemain; pengeluaran ikut cabang yang
 * dipilih saat mencatat (kosong = seluruh akademi). Staf yang dibatasi cabang hanya melihat cabangnya dan tanpa angka uang.
 */

export interface BranchStats {
  branchId: string | null;
  name: string;
  activePlayers: number;
  newPlayers: number;
  leftPlayers: number;
  teams: number;
  sessions: number;
  attendanceRate: number | null;
  /** Null bila pengguna tidak boleh melihat uang. */
  collected: number | null;
  expenses: number | null;
  outstanding: number | null;
}

export interface MonthPoint {
  month: string;
  activePlayers: number;
  attendanceRate: number | null;
  collected: number | null;
  expenses: number | null;
  registrations: number;
}

export interface Analytics {
  from: string;
  to: string;
  money: boolean;
  branches: BranchStats[];
  total: BranchStats;
  trend: MonthPoint[];
  programs: { name: string; players: number }[];
  topAbsent: { playerId: string; fullName: string; rate: number; sessions: number }[];
}

const NONE = "00000000-0000-0000-0000-000000000000";

/** Cabang tiap pemain aktif (bisa lebih dari satu). */
const PLAYER_BRANCH = sql`
  SELECT DISTINCT tp.player_id, l.branch_id
  FROM bola.team_players tp JOIN bola.teams t ON t.id = tp.team_id JOIN bola.locations l ON l.id = t.location_id`;

async function branchList(tx: Tx, scope: string[] | null) {
  return (await tx.execute(sql`
    SELECT id, name FROM bola.branches WHERE archived_at IS NULL
      ${scope ? sql`AND id = ANY (${`{${scope.join(",")}}`}::uuid[])` : sql``}
    ORDER BY is_primary DESC, lower(name)`)) as unknown as { id: string; name: string }[];
}

async function statsFor(tx: Tx, from: string, to: string, money: boolean): Promise<Map<string, Omit<BranchStats, "branchId" | "name">>> {
  const rows = (await tx.execute(sql`
    WITH pb AS (${PLAYER_BRANCH}),
    players AS (
      SELECT pb.branch_id,
        count(DISTINCT p.id) FILTER (WHERE p.status = 'active')::int AS active,
        count(DISTINCT p.id) FILTER (WHERE p.created_at::date BETWEEN ${from}::date AND ${to}::date)::int AS new,
        count(DISTINCT p.id) FILTER (WHERE p.status = 'inactive' AND p.updated_at::date BETWEEN ${from}::date AND ${to}::date)::int AS left_
      FROM pb JOIN bola.players p ON p.id = pb.player_id GROUP BY pb.branch_id
    ),
    teams AS (
      SELECT l.branch_id, count(*)::int AS n FROM bola.teams t JOIN bola.locations l ON l.id = t.location_id
      WHERE t.archived_at IS NULL GROUP BY l.branch_id
    ),
    sess AS (
      SELECT l.branch_id, count(DISTINCT s.id)::int AS n,
        count(a.*) FILTER (WHERE a.status = 'present')::int AS present,
        count(a.*)::int AS marked
      FROM bola.sessions s JOIN bola.locations l ON l.id = s.location_id JOIN core.businesses b ON b.id = s.business_id
      LEFT JOIN bola.attendance a ON a.session_id = s.id
      WHERE s.status = 'scheduled' AND (s.starts_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date AND s.starts_at < now()
      GROUP BY l.branch_id
    ),
    paid AS (
      SELECT coalesce(pb.branch_id, ${NONE}::uuid) AS branch_id,
        sum(pay.amount / greatest(1, (SELECT count(*) FROM pb x WHERE x.player_id = i.player_id)))::bigint AS amount
      FROM bola.payments pay JOIN bola.invoices i ON i.id = pay.invoice_id
      LEFT JOIN pb ON pb.player_id = i.player_id
      WHERE pay.voided_at IS NULL AND pay.paid_on BETWEEN ${from}::date AND ${to}::date
      GROUP BY 1
    ),
    owed AS (
      SELECT coalesce(pb.branch_id, ${NONE}::uuid) AS branch_id,
        sum((i.amount - i.discount - coalesce((SELECT sum(amount) FROM bola.payments x WHERE x.invoice_id = i.id AND x.voided_at IS NULL), 0))
            / greatest(1, (SELECT count(*) FROM pb y WHERE y.player_id = i.player_id)))::bigint AS amount
      FROM bola.invoices i LEFT JOIN pb ON pb.player_id = i.player_id
      WHERE i.status = 'unpaid' GROUP BY 1
    ),
    spent AS (
      SELECT coalesce(branch_id, ${NONE}::uuid) AS branch_id, sum(amount)::bigint AS amount FROM bola.expenses
      WHERE voided_at IS NULL AND spent_on BETWEEN ${from}::date AND ${to}::date GROUP BY 1
    ),
    keys AS (
      SELECT branch_id FROM players UNION SELECT branch_id FROM teams UNION SELECT branch_id FROM sess
      UNION SELECT branch_id FROM paid UNION SELECT branch_id FROM owed UNION SELECT branch_id FROM spent
    )
    SELECT k.branch_id AS "branchId",
      coalesce(pl.active, 0) AS "activePlayers", coalesce(pl.new, 0) AS "newPlayers", coalesce(pl.left_, 0) AS "leftPlayers",
      coalesce(t.n, 0) AS teams, coalesce(se.n, 0) AS sessions, coalesce(se.present, 0) AS present, coalesce(se.marked, 0) AS marked,
      coalesce(pa.amount, 0)::int AS collected, coalesce(sp.amount, 0)::int AS expenses, coalesce(ow.amount, 0)::int AS outstanding
    FROM keys k
    LEFT JOIN players pl ON pl.branch_id = k.branch_id LEFT JOIN teams t ON t.branch_id = k.branch_id
    LEFT JOIN sess se ON se.branch_id = k.branch_id LEFT JOIN paid pa ON pa.branch_id = k.branch_id
    LEFT JOIN owed ow ON ow.branch_id = k.branch_id LEFT JOIN spent sp ON sp.branch_id = k.branch_id`)) as unknown as {
    branchId: string; activePlayers: number; newPlayers: number; leftPlayers: number; teams: number; sessions: number;
    present: number; marked: number; collected: number; expenses: number; outstanding: number;
  }[];
  return new Map(
    rows.map((r) => [
      r.branchId,
      {
        activePlayers: r.activePlayers,
        newPlayers: r.newPlayers,
        leftPlayers: r.leftPlayers,
        teams: r.teams,
        sessions: r.sessions,
        attendanceRate: r.marked ? Math.round((r.present / r.marked) * 100) : null,
        collected: money ? r.collected : null,
        expenses: money ? r.expenses : null,
        outstanding: money ? r.outstanding : null,
        ...{ _present: r.present, _marked: r.marked },
      } as Omit<BranchStats, "branchId" | "name"> & { _present: number; _marked: number },
    ]),
  );
}

const sum = (xs: (number | null)[]) => (xs.every((x) => x === null) ? null : xs.reduce<number>((a, x) => a + (x ?? 0), 0));

export async function analytics(ctx: AcademyContext, from: string, to: string): Promise<Analytics> {
  requirePermission(ctx, "analytics.read");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) throw new AppError(422, "invalid", "Periode tidak valid.");
  const money = ctx.branchIds === null && ctx.can("accounting.read");
  return inAcademy(ctx, async (tx) => {
    const list = await branchList(tx, ctx.branchIds);
    const stats = await statsFor(tx, from, to, money);
    const empty = { activePlayers: 0, newPlayers: 0, leftPlayers: 0, teams: 0, sessions: 0, attendanceRate: null, collected: money ? 0 : null, expenses: money ? 0 : null, outstanding: money ? 0 : null };
    const clean = (v: ReturnType<typeof stats.get>) => {
      if (!v) return {};
      const { _present: _p, _marked: _m, ...rest } = v as typeof v & { _present: number; _marked: number };
      return rest;
    };
    const branches: BranchStats[] = list.map((b) => ({ branchId: b.id, name: b.name, ...empty, ...clean(stats.get(b.id)) }));
    // Uang tanpa cabang (pengeluaran umum, pemain belum punya tim) ditampilkan terpisah.
    const general = stats.get(NONE);
    if (money && general && (general.collected || general.expenses || general.outstanding)) {
      branches.push({ branchId: null, name: "Seluruh akademi / tanpa cabang", ...empty, collected: general.collected, expenses: general.expenses, outstanding: general.outstanding });
    }
    const raw = [...stats.entries()].filter(([k]) => ctx.branchIds === null || ctx.branchIds.includes(k)) as unknown as [string, { _present: number; _marked: number }][];
    const present = raw.reduce((a, [, v]) => a + v._present, 0);
    const marked = raw.reduce((a, [, v]) => a + v._marked, 0);
    const [players] = (await tx.execute(sql`
      WITH pb AS (${PLAYER_BRANCH})
      SELECT count(DISTINCT p.id) FILTER (WHERE p.status = 'active')::int AS active,
        count(DISTINCT p.id) FILTER (WHERE p.created_at::date BETWEEN ${from}::date AND ${to}::date)::int AS new,
        count(DISTINCT p.id) FILTER (WHERE p.status = 'inactive' AND p.updated_at::date BETWEEN ${from}::date AND ${to}::date)::int AS left_
      FROM bola.players p
      ${ctx.branchIds ? sql`JOIN pb ON pb.player_id = p.id AND pb.branch_id = ANY (${`{${ctx.branchIds.join(",")}}`}::uuid[])` : sql``}`)) as unknown as { active: number; new: number; left_: number }[];
    const total: BranchStats = {
      branchId: null,
      name: "Total",
      activePlayers: players!.active,
      newPlayers: players!.new,
      leftPlayers: players!.left_,
      teams: branches.reduce((a, b) => a + b.teams, 0),
      sessions: branches.reduce((a, b) => a + b.sessions, 0),
      attendanceRate: marked ? Math.round((present / marked) * 100) : null,
      collected: sum(branches.map((b) => b.collected)),
      expenses: sum(branches.map((b) => b.expenses)),
      outstanding: sum(branches.map((b) => b.outstanding)),
    };

    const scope = ctx.branchIds ? sql`AND l.branch_id = ANY (${`{${ctx.branchIds.join(",")}}`}::uuid[])` : sql``;
    const trend = (await tx.execute(sql`
      WITH m AS (
        SELECT generate_series(date_trunc('month', ${to}::date) - interval '5 months', date_trunc('month', ${to}::date), interval '1 month')::date AS m
      )
      SELECT to_char(m.m, 'YYYY-MM') AS month,
        (SELECT count(*) FROM bola.players p WHERE p.created_at < m.m + interval '1 month'
           AND (p.status = 'active' OR p.updated_at >= m.m + interval '1 month'))::int AS "activePlayers",
        (SELECT round(100.0 * count(*) FILTER (WHERE a.status = 'present') / nullif(count(*), 0))::int
           FROM bola.attendance a JOIN bola.sessions s ON s.id = a.session_id JOIN bola.locations l ON l.id = s.location_id
           JOIN core.businesses b ON b.id = s.business_id
           WHERE date_trunc('month', s.starts_at AT TIME ZONE b.timezone) = m.m ${scope}) AS "attendanceRate",
        ${money ? sql`(SELECT coalesce(sum(amount), 0) FROM bola.payments WHERE voided_at IS NULL AND date_trunc('month', paid_on) = m.m)::int` : sql`NULL::int`} AS collected,
        ${money ? sql`(SELECT coalesce(sum(amount), 0) FROM bola.expenses WHERE voided_at IS NULL AND date_trunc('month', spent_on) = m.m)::int` : sql`NULL::int`} AS expenses,
        (SELECT count(*) FROM bola.registrations r WHERE date_trunc('month', r.created_at) = m.m)::int AS registrations
      FROM m ORDER BY m.m`)) as unknown as MonthPoint[];

    const programs = (await tx.execute(sql`
      SELECT coalesce(pr.name, 'Tanpa program') AS name, count(DISTINCT tp.player_id)::int AS players
      FROM bola.team_players tp JOIN bola.players p ON p.id = tp.player_id AND p.status = 'active'
      JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL JOIN bola.locations l ON l.id = t.location_id
      LEFT JOIN bola.programs pr ON pr.id = t.program_id
      WHERE true ${scope}
      GROUP BY 1 ORDER BY 2 DESC LIMIT 8`)) as unknown as { name: string; players: number }[];

    const topAbsent = (await tx.execute(sql`
      SELECT p.id AS "playerId", p.full_name AS "fullName", count(*)::int AS sessions,
        round(100.0 * count(*) FILTER (WHERE a.status = 'present') / count(*))::int AS rate
      FROM bola.attendance a JOIN bola.players p ON p.id = a.player_id AND p.status = 'active'
      JOIN bola.sessions s ON s.id = a.session_id JOIN bola.locations l ON l.id = s.location_id JOIN core.businesses b ON b.id = s.business_id
      WHERE (s.starts_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date ${scope}
      GROUP BY p.id HAVING count(*) >= 3
      ORDER BY rate, sessions DESC LIMIT 8`)) as unknown as Analytics["topAbsent"];

    return { from, to, money, branches, total, trend, programs, topAbsent: topAbsent.filter((t) => t.rate < 75) };
  });
}
