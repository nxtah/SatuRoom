import "server-only";
import { sql } from "drizzle-orm";
import { inVenue, requirePermission, type VenueContext } from "./context";

export interface DayRevenue {
  date: string;
  table: number;
  fnb: number;
  tournament: number;
  sessions: number;
}

export interface TableUse {
  name: string;
  minutes: number;
  sessions: number;
  revenue: number;
  /** Persen dari jam buka dalam rentang laporan. */
  utilization: number;
}

export interface Report {
  from: string;
  to: string;
  days: DayRevenue[];
  totals: { revenue: number; table: number; fnb: number; tournament: number; sessions: number; avgPerSession: number; hoursPlayed: number; discount: number };
  methods: { method: string; amount: number }[];
  topups: number;
  newMembers: number;
  tables: TableUse[];
  /** Jumlah sesi dimulai per jam (0-23), untuk melihat jam ramai. */
  hours: number[];
  topMenu: { name: string; qty: number; revenue: number }[];
  topMembers: { name: string; visits: number; spent: number }[];
  noShows: number;
}

/** Laporan satu rentang tanggal (zona waktu tempat). Omzet = sesi tertutup + biaya turnamen yang sudah dibayar. */
export function report(ctx: VenueContext, from: string, to: string): Promise<Report> {
  requirePermission(ctx, "reports.read");
  return inVenue(ctx, async (tx) => {
    const q = async <T>(query: ReturnType<typeof sql>) => (await tx.execute(query)) as unknown as T[];
    const days = await q<DayRevenue>(sql`
      WITH d AS (SELECT generate_series(${from}::date, ${to}::date, '1 day')::date AS day),
      s AS (
        SELECT (x.started_at AT TIME ZONE b.timezone)::date AS day, sum(x.time_charge - x.discount_amount)::int AS tbl, sum(x.fnb_total)::int AS fnb, count(*)::int AS n
        FROM mahjong.play_sessions x JOIN core.businesses b ON b.id = x.business_id WHERE x.status = 'closed' GROUP BY 1),
      t AS (
        SELECT t.event_date AS day, (count(p.id) FILTER (WHERE p.paid) * t.entry_fee)::int AS fee
        FROM mahjong.tournaments t LEFT JOIN mahjong.tournament_players p ON p.tournament_id = t.id GROUP BY t.id)
      SELECT to_char(d.day, 'YYYY-MM-DD') AS date, coalesce(s.tbl, 0) AS "table", coalesce(s.fnb, 0) AS fnb,
             coalesce((SELECT sum(fee) FROM t WHERE t.day = d.day), 0)::int AS tournament, coalesce(s.n, 0) AS sessions
      FROM d LEFT JOIN s ON s.day = d.day ORDER BY d.day`);
    const sum = (k: keyof DayRevenue) => days.reduce((n, r) => n + (r[k] as number), 0);
    const [agg] = await q<{ hours: number; discount: number }>(sql`
      SELECT coalesce(sum(extract(epoch FROM (s.ended_at - s.started_at)) / 3600), 0)::float AS hours, coalesce(sum(s.discount_amount), 0)::int AS discount
      FROM mahjong.play_sessions s JOIN core.businesses b ON b.id = s.business_id
      WHERE s.status = 'closed' AND (s.started_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date`);
    const methods = await q<{ method: string; amount: number }>(sql`
      SELECT p.method, sum(p.amount)::int AS amount FROM mahjong.payments p
      JOIN mahjong.play_sessions s ON s.id = p.session_id JOIN core.businesses b ON b.id = s.business_id
      WHERE s.status = 'closed' AND (s.started_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY p.method ORDER BY 2 DESC`);
    const [top] = await q<{ n: number }>(sql`
      SELECT coalesce(sum(l.amount), 0)::int AS n FROM mahjong.member_ledger l JOIN core.businesses b ON b.id = l.business_id
      WHERE l.kind = 'topup' AND (l.created_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date`);
    const [nm] = await q<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM mahjong.members m JOIN core.businesses b ON b.id = m.business_id
      WHERE (m.created_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date`);
    const span = Math.max(1, days.length);
    const tables = await q<TableUse>(sql`
      SELECT t.name, coalesce(sum(extract(epoch FROM (s.ended_at - s.started_at)) / 60), 0)::int AS minutes, count(s.id)::int AS sessions,
             coalesce(sum(s.total), 0)::int AS revenue,
             least(100, round(100.0 * coalesce(sum(extract(epoch FROM (s.ended_at - s.started_at)) / 60), 0)
               / (${span} * greatest(60, extract(epoch FROM (st.close_time - st.open_time)) / 60)))::int) AS utilization
      FROM mahjong.mj_tables t
      JOIN mahjong.venue_settings st ON st.business_id = t.business_id
      JOIN core.businesses b ON b.id = t.business_id
      LEFT JOIN mahjong.play_sessions s ON s.table_id = t.id AND s.status = 'closed'
        AND (s.started_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date
      WHERE t.archived_at IS NULL GROUP BY t.id, t.name, t.sort_order, st.close_time, st.open_time ORDER BY t.sort_order, t.name`);
    const hourRows = await q<{ h: number; n: number }>(sql`
      SELECT extract(hour FROM s.started_at AT TIME ZONE b.timezone)::int AS h, count(*)::int AS n
      FROM mahjong.play_sessions s JOIN core.businesses b ON b.id = s.business_id
      WHERE s.status = 'closed' AND (s.started_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date GROUP BY 1`);
    const hours = Array.from({ length: 24 }, (_, h) => hourRows.find((r) => r.h === h)?.n ?? 0);
    const topMenu = await q<Report["topMenu"][number]>(sql`
      SELECT o.name, sum(o.qty)::int AS qty, sum(o.qty * o.unit_price)::int AS revenue
      FROM mahjong.session_orders o JOIN mahjong.play_sessions s ON s.id = o.session_id JOIN core.businesses b ON b.id = s.business_id
      WHERE o.status <> 'void' AND s.status = 'closed' AND (s.started_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY o.name ORDER BY 2 DESC, 3 DESC LIMIT 6`);
    const topMembers = await q<Report["topMembers"][number]>(sql`
      SELECT m.full_name AS name, count(*)::int AS visits, sum(s.total)::int AS spent
      FROM mahjong.play_sessions s JOIN mahjong.members m ON m.id = s.member_id JOIN core.businesses b ON b.id = s.business_id
      WHERE s.status = 'closed' AND (s.started_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date
      GROUP BY m.id, m.full_name ORDER BY 3 DESC LIMIT 5`);
    const [ns] = await q<{ n: number }>(sql`
      SELECT count(*)::int AS n FROM mahjong.bookings k JOIN core.businesses b ON b.id = k.business_id
      WHERE k.status = 'no_show' AND (k.starts_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date`);
    const table = sum("table");
    const fnb = sum("fnb");
    const tournament = sum("tournament");
    const sessions = sum("sessions");
    return {
      from, to, days,
      totals: { revenue: table + fnb + tournament, table, fnb, tournament, sessions, avgPerSession: sessions ? Math.round((table + fnb) / sessions) : 0, hoursPlayed: Math.round((agg?.hours ?? 0) * 10) / 10, discount: agg?.discount ?? 0 },
      methods, topups: top?.n ?? 0, newMembers: nm?.n ?? 0, tables, hours, topMenu, topMembers, noShows: ns?.n ?? 0,
    };
  });
}

export interface HomeStats {
  today: string;
  revenueToday: number;
  sessionsToday: number;
  playingNow: number;
  tablesTotal: number;
  bookingsToday: number;
  requests: number;
  members: number;
  /** Omzet 7 hari terakhir untuk grafik mini (hanya bila boleh melihat laporan). */
  week: { date: string; revenue: number }[] | null;
}

export function homeStats(ctx: VenueContext): Promise<HomeStats> {
  return inVenue(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`
      WITH b AS (SELECT timezone FROM core.businesses WHERE id = ${ctx.businessId}::uuid), today AS (SELECT (now() AT TIME ZONE (SELECT timezone FROM b))::date AS d)
      SELECT (SELECT d FROM today)::text AS today,
        coalesce((SELECT sum(total) FROM mahjong.play_sessions s WHERE s.status = 'closed' AND (s.started_at AT TIME ZONE (SELECT timezone FROM b))::date = (SELECT d FROM today)), 0)::int AS "closedToday",
        (SELECT count(*) FROM mahjong.play_sessions s WHERE s.status = 'closed' AND (s.started_at AT TIME ZONE (SELECT timezone FROM b))::date = (SELECT d FROM today))::int AS "sessionsToday",
        (SELECT count(*) FROM mahjong.play_sessions WHERE status = 'open')::int AS "playingNow",
        (SELECT count(*) FROM mahjong.mj_tables WHERE archived_at IS NULL)::int AS "tablesTotal",
        (SELECT count(*) FROM mahjong.bookings k WHERE k.status IN ('booked', 'arrived') AND (k.starts_at AT TIME ZONE (SELECT timezone FROM b))::date = (SELECT d FROM today))::int AS "bookingsToday",
        (SELECT count(*) FROM mahjong.bookings WHERE status = 'requested' AND ends_at > now())::int AS requests,
        (SELECT count(*) FROM mahjong.members WHERE archived_at IS NULL)::int AS members`)) as unknown as (Omit<HomeStats, "revenueToday" | "week"> & { closedToday: number })[];
    const r = row!;
    let week: HomeStats["week"] = null;
    let revenueToday = r.closedToday;
    if (ctx.can("reports.read")) {
      const days = (await tx.execute(sql`
        SELECT to_char(d, 'YYYY-MM-DD') AS date, coalesce((SELECT sum(total) FROM mahjong.play_sessions s JOIN core.businesses b ON b.id = s.business_id
          WHERE s.status = 'closed' AND (s.started_at AT TIME ZONE b.timezone)::date = d), 0)::int AS revenue
        FROM generate_series(${r.today}::date - 6, ${r.today}::date, '1 day') d ORDER BY d`)) as unknown as { date: string; revenue: number }[];
      week = days;
      revenueToday = days.at(-1)?.revenue ?? 0;
    }
    return { ...r, revenueToday, week };
  });
}
