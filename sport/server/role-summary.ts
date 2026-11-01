import "server-only";
import { sql } from "drizzle-orm";
import { inAcademy, type AcademyContext } from "./context";
import { academyToday } from "./schedule";
import { attendanceBoard, canMonitorAttendance } from "./staff-attendance";

export interface RoleSummary {
  /** Pemasukan dan pengeluaran 6 bulan terakhir (lama ke baru), dari jurnal. */
  money: { months: { month: string; income: number; expense: number }[]; cash: number } | null;
  /** Absensi kerja staf hari ini. */
  staff: { present: number; late: number; absent: number; waiting: number; leave: number; total: number } | null;
  store: { salesMonth: number; pending: number; lowStock: number } | null;
  /** Untuk pelatih: sesi tim yang dia latih minggu ini dan rencana latihannya. */
  coach: { week: number; planned: number; next: { id: string; team: string; date: string; time: string; topic: string | null }[] } | null;
}

/** Ringkasan beranda sesuai peran: pemilik/admin melihat uang, staf, toko; pelatih melihat jadwal dan rencananya. */
export async function roleSummary(ctx: AcademyContext): Promise<RoleSummary> {
  const staffBoard = (await canMonitorAttendance(ctx)) ? await attendanceBoard(ctx) : null;
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    let money: RoleSummary["money"] = null;
    if (ctx.modules.has("accounting") && ctx.can("accounting.read") && ctx.branchIds === null) {
      const rows = (await tx.execute(sql`
        WITH m AS (SELECT generate_series(date_trunc('month', ${today}::date) - interval '5 months', date_trunc('month', ${today}::date), interval '1 month')::date AS month)
        SELECT to_char(m.month, 'YYYY-MM') AS month,
          coalesce(sum(CASE WHEN a.type = 'income' THEN l.credit - l.debit END), 0)::bigint AS income,
          coalesce(sum(CASE WHEN a.type = 'expense' THEN l.debit - l.credit END), 0)::bigint AS expense
        FROM m
        LEFT JOIN bola.journals j ON date_trunc('month', j.entry_date) = m.month
        LEFT JOIN bola.journal_lines l ON l.journal_id = j.id
        LEFT JOIN bola.accounts a ON a.id = l.account_id
        GROUP BY m.month ORDER BY m.month`)) as unknown as { month: string; income: string; expense: string }[];
      const [c] = (await tx.execute(sql`
        SELECT coalesce(sum(l.debit - l.credit), 0)::bigint AS cash FROM bola.journal_lines l
        JOIN bola.accounts a ON a.id = l.account_id WHERE a.system_key IN ('cash', 'bank')`)) as unknown as { cash: string }[];
      money = { months: rows.map((r) => ({ month: r.month, income: Number(r.income), expense: Number(r.expense) })), cash: Number(c?.cash ?? 0) };
    }
    let store: RoleSummary["store"] = null;
    if (ctx.modules.has("store") && ctx.can("store.manage") && ctx.branchIds === null) {
      const [s] = (await tx.execute(sql`
        SELECT coalesce(sum(total) FILTER (WHERE status IN ('paid', 'fulfilled') AND date_trunc('month', paid_on) = date_trunc('month', ${today}::date)), 0)::int AS sales,
               count(*) FILTER (WHERE status = 'pending')::int AS pending,
               (SELECT count(*)::int FROM bola.items WHERE archived_at IS NULL AND min_qty > 0 AND qty <= min_qty) AS low
        FROM bola.orders`)) as unknown as { sales: number; pending: number; low: number }[];
      store = { salesMonth: s!.sales, pending: s!.pending, lowStock: s!.low };
    }
    let coach: RoleSummary["coach"] = null;
    if (ctx.roles.includes("coach") || ctx.roles.includes("head_coach")) {
      const rows = (await tx.execute(sql`
        SELECT s.id, t.name AS team, to_char(s.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date,
               to_char(s.starts_at AT TIME ZONE b.timezone, 'HH24:MI') AS time, s.topic
        FROM bola.sessions s JOIN bola.teams t ON t.id = s.team_id JOIN core.businesses b ON b.id = s.business_id
        JOIN bola.team_coaches tc ON tc.team_id = s.team_id AND tc.membership_id = ${ctx.membershipId}::uuid
        WHERE s.status = 'scheduled' AND s.kind = 'training'
          AND (s.starts_at AT TIME ZONE b.timezone)::date BETWEEN ${today}::date AND ${today}::date + 6
        ORDER BY s.starts_at`)) as unknown as { id: string; team: string; date: string; time: string; topic: string | null }[];
      coach = { week: rows.length, planned: rows.filter((r) => r.topic).length, next: rows.slice(0, 4) };
    }
    let staff: RoleSummary["staff"] = null;
    if (staffBoard) {
      const n = (k: string) => staffBoard.rows.filter((r) => r.status === k).length;
      staff = { present: n("present"), late: n("late"), absent: n("absent"), waiting: n("waiting"), leave: n("leave"), total: staffBoard.rows.filter((r) => r.status !== "off").length };
    }
    return { money, staff, store, coach };
  });
}
