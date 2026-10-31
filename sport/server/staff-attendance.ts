import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql, type SQL } from "drizzle-orm";
import type { z } from "zod";
import type { ShiftsInput, StaffRequestDecisionInput, StaffRequestInput } from "@/lib/schemas";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { academyToday } from "./schedule";

/** Batas toleransi terlambat dari jam masuk jadwal. */
export const LATE_GRACE_MIN = 10;

export type RequestKind = "correction" | "leave" | "overtime";
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type LeaveType = "annual" | "sick" | "personal" | "unpaid";

export interface Shift {
  weekday: number;
  start: string;
  end: string;
}

export interface ClockRow {
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  source: "self" | "correction";
}

export interface StaffRequestRow {
  id: string;
  membershipId: string;
  staffName: string;
  kind: RequestKind;
  dateFrom: string;
  dateTo: string;
  clockIn: string | null;
  clockOut: string | null;
  minutes: number | null;
  leaveType: LeaveType | null;
  reason: string;
  status: RequestStatus;
  decisionNote: string | null;
  createdAt: string;
}

/** Filter SQL anggota yang terlihat (batas cabang). `m` = alias core.memberships. */
function memberScope(ctx: AcademyContext): SQL {
  if (ctx.branchIds === null) return sql``;
  return sql`AND (m.id = ${ctx.membershipId}::uuid OR EXISTS (
    SELECT 1 FROM bola.staff_branches sb WHERE sb.membership_id = m.id
      AND sb.branch_id = ANY (${`{${ctx.branchIds.join(",")}}`}::uuid[])))`;
}

async function weekdayOf(tx: Tx, date: string): Promise<number> {
  const [r] = (await tx.execute(sql`SELECT extract(isodow FROM ${date}::date)::int AS d`)) as unknown as { d: number }[];
  return r!.d;
}

const REQUEST_COLUMNS = sql`
  r.id, r.membership_id AS "membershipId", u.name AS "staffName", r.kind,
  to_char(r.date_from, 'YYYY-MM-DD') AS "dateFrom", to_char(r.date_to, 'YYYY-MM-DD') AS "dateTo",
  to_char(r.clock_in, 'HH24:MI') AS "clockIn", to_char(r.clock_out, 'HH24:MI') AS "clockOut",
  r.minutes, r.leave_type AS "leaveType", r.reason, r.status, r.decision_note AS "decisionNote",
  to_char(r.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"`;

// ---------- Untuk diri sendiri ----------

export interface MyAttendance {
  today: string;
  shiftToday: Shift | null;
  clock: ClockRow | null;
  onLeave: boolean;
  shifts: Shift[];
  requests: StaffRequestRow[];
  month: MonthTotals;
}

export interface MonthTotals {
  daysPresent: number;
  lateDays: number;
  workedMinutes: number;
  overtimeMinutes: number;
  leaveDays: number;
}

export async function myAttendance(ctx: AcademyContext): Promise<MyAttendance> {
  requireModule(ctx, "staff_attendance");
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    const weekday = await weekdayOf(tx, today);
    const shifts = await shiftsOf(tx, ctx.membershipId);
    const [clock] = (await tx.execute(sql`
      SELECT to_char(c.work_date, 'YYYY-MM-DD') AS "workDate",
             to_char(c.clock_in AT TIME ZONE b.timezone, 'HH24:MI') AS "clockIn",
             to_char(c.clock_out AT TIME ZONE b.timezone, 'HH24:MI') AS "clockOut", c.source
      FROM bola.staff_clock c JOIN core.businesses b ON b.id = c.business_id
      WHERE c.membership_id = ${ctx.membershipId}::uuid AND c.work_date = ${today}::date`)) as unknown as ClockRow[];
    const [leave] = (await tx.execute(sql`
      SELECT 1 AS x FROM bola.staff_requests WHERE membership_id = ${ctx.membershipId}::uuid AND kind = 'leave'
        AND status = 'approved' AND ${today}::date BETWEEN date_from AND date_to`)) as unknown as unknown[];
    const requests = (await tx.execute(sql`
      SELECT ${REQUEST_COLUMNS}
      FROM bola.staff_requests r JOIN core.memberships m ON m.id = r.membership_id JOIN core.users u ON u.id = m.user_id
      WHERE r.membership_id = ${ctx.membershipId}::uuid
      ORDER BY r.created_at DESC LIMIT 20`)) as unknown as StaffRequestRow[];
    const totals = await monthTotals(tx, today.slice(0, 7), [ctx.membershipId]);
    return {
      today,
      shiftToday: shifts.find((s) => s.weekday === weekday) ?? null,
      clock: clock ?? null,
      onLeave: Boolean(leave),
      shifts,
      requests,
      month: totals.get(ctx.membershipId) ?? emptyTotals(),
    };
  });
}

/** Absen masuk hari ini. Sekali per hari. */
export async function clockIn(ctx: AcademyContext): Promise<void> {
  requireModule(ctx, "staff_attendance");
  await inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    const rows = (await tx.execute(sql`
      INSERT INTO bola.staff_clock (business_id, membership_id, work_date, clock_in)
      VALUES (${ctx.businessId}::uuid, ${ctx.membershipId}::uuid, ${today}::date, now())
      ON CONFLICT (membership_id, work_date) DO NOTHING RETURNING id`)) as unknown as { id: string }[];
    if (!rows.length) throw new AppError(409, "already", "Anda sudah absen masuk hari ini.");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "staff.clock_in", targetType: "membership", targetId: ctx.membershipId });
  });
}

/** Absen pulang hari ini. Harus sudah absen masuk. */
export async function clockOut(ctx: AcademyContext): Promise<void> {
  requireModule(ctx, "staff_attendance");
  await inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    const rows = (await tx.execute(sql`
      UPDATE bola.staff_clock SET clock_out = greatest(now(), clock_in + interval '1 minute')
      WHERE membership_id = ${ctx.membershipId}::uuid AND work_date = ${today}::date AND clock_out IS NULL
      RETURNING id`)) as unknown as { id: string }[];
    if (!rows.length) throw new AppError(409, "not_in", "Absen masuk dulu, atau Anda sudah absen pulang hari ini.");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "staff.clock_out", targetType: "membership", targetId: ctx.membershipId });
  });
}

export async function createStaffRequest(ctx: AcademyContext, input: z.infer<typeof StaffRequestInput>): Promise<string> {
  requireModule(ctx, "staff_attendance");
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    let values: SQL;
    if (input.kind === "correction") {
      if (input.date > today) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { date: "Koreksi hanya untuk hari ini atau sebelumnya." });
      if (input.clockOut && input.clockOut <= input.clockIn) {
        throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { clockOut: "Jam pulang harus setelah jam masuk." });
      }
      values = sql`'correction', ${input.date}::date, ${input.date}::date, ${input.clockIn}::time, ${input.clockOut ?? null}::time, NULL, NULL`;
    } else if (input.kind === "leave") {
      if (input.dateTo < input.dateFrom) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { dateTo: "Tanggal selesai harus setelah tanggal mulai." });
      values = sql`'leave', ${input.dateFrom}::date, ${input.dateTo}::date, NULL, NULL, NULL, ${input.leaveType}`;
    } else {
      if (input.date > today) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { date: "Lembur dicatat setelah dikerjakan." });
      values = sql`'overtime', ${input.date}::date, ${input.date}::date, NULL, NULL, ${input.minutes}::int, NULL`;
    }
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.staff_requests (business_id, membership_id, kind, date_from, date_to, clock_in, clock_out, minutes, leave_type, reason)
      VALUES (${ctx.businessId}::uuid, ${ctx.membershipId}::uuid, ${values}, ${input.reason})
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: `staff_request.${input.kind}`, targetType: "staff_request", targetId: row!.id });
    return row!.id;
  });
}

export async function cancelStaffRequest(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "staff_attendance");
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE bola.staff_requests SET status = 'cancelled'
      WHERE id = ${id}::uuid AND membership_id = ${ctx.membershipId}::uuid AND status = 'pending' RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Pengajuan");
  });
}

// ---------- Untuk pengelola ----------

async function shiftsOf(tx: Tx, membershipId: string): Promise<Shift[]> {
  return (await tx.execute(sql`
    SELECT weekday, to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS "end"
    FROM bola.staff_shifts WHERE membership_id = ${membershipId}::uuid ORDER BY weekday`)) as unknown as Shift[];
}

async function assertMemberInScope(ctx: AcademyContext, tx: Tx, membershipId: string) {
  const [row] = (await tx.execute(sql`
    SELECT m.id FROM core.memberships m
    WHERE m.id = ${membershipId}::uuid AND m.business_id = ${ctx.businessId}::uuid AND m.status = 'active' ${memberScope(ctx)}`)) as unknown as unknown[];
  if (!row) throw notFound("Staf");
}

/** Ganti seluruh jadwal kerja mingguan satu staf. */
export async function setShifts(ctx: AcademyContext, membershipId: string, input: z.infer<typeof ShiftsInput>): Promise<void> {
  requireModule(ctx, "staff_attendance");
  requirePermission(ctx, "staff_attendance.manage");
  await inAcademy(ctx, async (tx) => {
    await assertMemberInScope(ctx, tx, membershipId);
    await tx.execute(sql`DELETE FROM bola.staff_shifts WHERE membership_id = ${membershipId}::uuid`);
    for (const s of input.shifts) {
      await tx.execute(sql`
        INSERT INTO bola.staff_shifts (business_id, membership_id, weekday, start_time, end_time)
        VALUES (${ctx.businessId}::uuid, ${membershipId}::uuid, ${s.weekday}::smallint, ${s.start}::time, ${s.end}::time)`);
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "staff.shifts_updated", targetType: "membership", targetId: membershipId, meta: { days: input.shifts.length } });
  });
}

export type DayStatus = "present" | "late" | "absent" | "leave" | "off" | "waiting";

export interface BoardRow {
  membershipId: string;
  name: string;
  shift: Shift | null;
  shifts: Shift[];
  clockIn: string | null;
  clockOut: string | null;
  status: DayStatus;
}

/** Papan absensi staf untuk satu tanggal. */
export async function attendanceBoard(ctx: AcademyContext, date?: string): Promise<{ date: string; today: string; rows: BoardRow[] }> {
  requireModule(ctx, "staff_attendance");
  requirePermission(ctx, "staff_attendance.manage");
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
    const weekday = await weekdayOf(tx, day);
    const [clockNow] = (await tx.execute(sql`
      SELECT to_char(now() AT TIME ZONE timezone, 'HH24:MI') AS t FROM core.businesses WHERE id = ${ctx.businessId}::uuid`)) as unknown as { t: string }[];
    const nowMin = minutesOf(clockNow!.t);
    const people = (await tx.execute(sql`
      SELECT m.id AS "membershipId", u.name FROM core.memberships m JOIN core.users u ON u.id = m.user_id
      WHERE m.business_id = ${ctx.businessId}::uuid AND m.status = 'active' ${memberScope(ctx)}
      ORDER BY lower(u.name)`)) as unknown as { membershipId: string; name: string }[];
    const shifts = (await tx.execute(sql`
      SELECT membership_id AS "membershipId", weekday, to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS "end"
      FROM bola.staff_shifts ORDER BY weekday`)) as unknown as (Shift & { membershipId: string })[];
    const clocks = (await tx.execute(sql`
      SELECT c.membership_id AS "membershipId",
             to_char(c.clock_in AT TIME ZONE b.timezone, 'HH24:MI') AS "clockIn",
             to_char(c.clock_out AT TIME ZONE b.timezone, 'HH24:MI') AS "clockOut"
      FROM bola.staff_clock c JOIN core.businesses b ON b.id = c.business_id
      WHERE c.work_date = ${day}::date`)) as unknown as { membershipId: string; clockIn: string; clockOut: string | null }[];
    const leaves = (await tx.execute(sql`
      SELECT membership_id AS "membershipId" FROM bola.staff_requests
      WHERE kind = 'leave' AND status = 'approved' AND ${day}::date BETWEEN date_from AND date_to`)) as unknown as { membershipId: string }[];
    const rows = people.map((p) => {
      const mine = shifts.filter((s) => s.membershipId === p.membershipId).map(({ weekday, start, end }) => ({ weekday, start, end }));
      const shift = mine.find((s) => s.weekday === weekday) ?? null;
      const c = clocks.find((x) => x.membershipId === p.membershipId);
      const status: DayStatus = leaves.some((l) => l.membershipId === p.membershipId)
        ? "leave"
        : c
          ? shift && minutesOf(c.clockIn) > minutesOf(shift.start) + LATE_GRACE_MIN
            ? "late"
            : "present"
          : !shift
            ? "off"
            : day < today || (day === today && minutesOf(shift.end) <= nowMin)
              ? "absent"
              : "waiting";
      return { ...p, shift, shifts: mine, clockIn: c?.clockIn ?? null, clockOut: c?.clockOut ?? null, status };
    });
    return { date: day, today, rows };
  });
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

export async function listStaffRequests(ctx: AcademyContext, status: "pending" | "done" = "pending"): Promise<StaffRequestRow[]> {
  requireModule(ctx, "staff_attendance");
  requirePermission(ctx, "staff_attendance.manage");
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT ${REQUEST_COLUMNS}
      FROM bola.staff_requests r JOIN core.memberships m ON m.id = r.membership_id JOIN core.users u ON u.id = m.user_id
      WHERE ${status === "pending" ? sql`r.status = 'pending'` : sql`r.status IN ('approved', 'rejected')`} ${memberScope(ctx)}
      ORDER BY r.created_at ${status === "pending" ? sql`ASC` : sql`DESC`} LIMIT 100`)) as unknown as StaffRequestRow[],
  );
}

/** Menyetujui atau menolak pengajuan. Koreksi yang disetujui langsung mengganti catatan absen hari itu. */
export async function decideStaffRequest(ctx: AcademyContext, id: string, input: z.infer<typeof StaffRequestDecisionInput>): Promise<void> {
  requireModule(ctx, "staff_attendance");
  requirePermission(ctx, "staff_attendance.manage");
  await inAcademy(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`
      SELECT r.membership_id AS "membershipId", r.kind, to_char(r.date_from, 'YYYY-MM-DD') AS date,
             to_char(r.clock_in, 'HH24:MI') AS "clockIn", to_char(r.clock_out, 'HH24:MI') AS "clockOut"
      FROM bola.staff_requests r JOIN core.memberships m ON m.id = r.membership_id
      WHERE r.id = ${id}::uuid AND r.status = 'pending' ${memberScope(ctx)}`)) as unknown as {
      membershipId: string; kind: RequestKind; date: string; clockIn: string | null; clockOut: string | null;
    }[];
    if (!r) throw notFound("Pengajuan");
    // Pengajuan sendiri diputuskan orang lain, kecuali pemilik.
    if (r.membershipId === ctx.membershipId && !ctx.roles.includes("owner")) throw forbidden();
    await tx.execute(sql`
      UPDATE bola.staff_requests SET status = ${input.decision}::bola.staff_request_status, decided_by = ${ctx.userId}::uuid,
        decided_at = now(), decision_note = ${input.note ?? null}
      WHERE id = ${id}::uuid`);
    if (input.decision === "approved" && r.kind === "correction") {
      await tx.execute(sql`
        INSERT INTO bola.staff_clock (business_id, membership_id, work_date, clock_in, clock_out, source)
        SELECT ${ctx.businessId}::uuid, ${r.membershipId}::uuid, ${r.date}::date,
               (${r.date}::date + ${r.clockIn}::time) AT TIME ZONE b.timezone,
               CASE WHEN ${r.clockOut}::time IS NULL THEN NULL ELSE (${r.date}::date + ${r.clockOut}::time) AT TIME ZONE b.timezone END,
               'correction'
        FROM core.businesses b WHERE b.id = ${ctx.businessId}::uuid
        ON CONFLICT (membership_id, work_date) DO UPDATE SET clock_in = excluded.clock_in, clock_out = excluded.clock_out, source = 'correction'`);
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: `staff_request.${input.decision}`, targetType: "staff_request", targetId: id, meta: { kind: r.kind } });
  });
}

// ---------- Rekap bulanan (dipakai juga oleh gaji) ----------

const emptyTotals = (): MonthTotals => ({ daysPresent: 0, lateDays: 0, workedMinutes: 0, overtimeMinutes: 0, leaveDays: 0 });

export async function monthTotals(tx: Tx, month: string, membershipIds?: string[]): Promise<Map<string, MonthTotals>> {
  const from = `${month}-01`;
  const filter = membershipIds ? sql`AND x.membership_id = ANY (${`{${membershipIds.join(",")}}`}::uuid[])` : sql``;
  const clocks = (await tx.execute(sql`
    SELECT x.membership_id AS "membershipId", count(*)::int AS days,
      count(*) FILTER (WHERE s.start_time IS NOT NULL
        AND (x.clock_in AT TIME ZONE b.timezone)::time > s.start_time + make_interval(mins => ${LATE_GRACE_MIN}))::int AS late,
      coalesce(sum(extract(epoch FROM (x.clock_out - x.clock_in)) / 60) FILTER (WHERE x.clock_out IS NOT NULL), 0)::int AS worked
    FROM bola.staff_clock x
    JOIN core.businesses b ON b.id = x.business_id
    LEFT JOIN bola.staff_shifts s ON s.membership_id = x.membership_id AND s.weekday = extract(isodow FROM x.work_date)
    WHERE x.work_date >= ${from}::date AND x.work_date < (${from}::date + interval '1 month') ${filter}
    GROUP BY x.membership_id`)) as unknown as { membershipId: string; days: number; late: number; worked: number }[];
  const reqs = (await tx.execute(sql`
    SELECT x.membership_id AS "membershipId",
      coalesce(sum(x.minutes) FILTER (WHERE x.kind = 'overtime'), 0)::int AS overtime,
      coalesce(sum((least(x.date_to, (${from}::date + interval '1 month' - interval '1 day')::date)
                  - greatest(x.date_from, ${from}::date) + 1)) FILTER (WHERE x.kind = 'leave'), 0)::int AS leave
    FROM bola.staff_requests x
    WHERE x.status = 'approved' AND x.kind IN ('overtime', 'leave')
      AND x.date_to >= ${from}::date AND x.date_from < (${from}::date + interval '1 month') ${filter}
    GROUP BY x.membership_id`)) as unknown as { membershipId: string; overtime: number; leave: number }[];
  const out = new Map<string, MonthTotals>();
  for (const c of clocks) out.set(c.membershipId, { ...emptyTotals(), daysPresent: c.days, lateDays: c.late, workedMinutes: c.worked });
  for (const r of reqs) {
    const t = out.get(r.membershipId) ?? emptyTotals();
    out.set(r.membershipId, { ...t, overtimeMinutes: r.overtime, leaveDays: r.leave });
  }
  return out;
}

export interface RecapRow extends MonthTotals {
  membershipId: string;
  name: string;
}

export async function monthlyRecap(ctx: AcademyContext, month: string): Promise<RecapRow[]> {
  requireModule(ctx, "staff_attendance");
  requirePermission(ctx, "staff_attendance.manage");
  if (!/^\d{4}-\d{2}$/.test(month)) throw new AppError(422, "invalid", "Bulan tidak valid.");
  return inAcademy(ctx, async (tx) => {
    const people = (await tx.execute(sql`
      SELECT m.id AS "membershipId", u.name FROM core.memberships m JOIN core.users u ON u.id = m.user_id
      WHERE m.business_id = ${ctx.businessId}::uuid AND m.status = 'active' ${memberScope(ctx)}
      ORDER BY lower(u.name)`)) as unknown as { membershipId: string; name: string }[];
    const totals = await monthTotals(tx, month, people.map((p) => p.membershipId));
    return people.map((p) => ({ ...p, ...(totals.get(p.membershipId) ?? emptyTotals()) }));
  });
}
