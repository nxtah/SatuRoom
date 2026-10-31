import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { accountIdOf, postJournal, reverseSource } from "./ledger";
import { academyToday } from "./schedule";
import { monthTotals } from "./staff-attendance";

const money = z.coerce.number().int().min(0).max(1_000_000_000);
export const PayProfileInput = z.object({
  baseSalary: money,
  perSession: money,
  allowance: money,
  overtimePerHour: money,
  lateDeduction: money,
  unpaidLeaveDeduction: money,
});
export type PayProfile = z.infer<typeof PayProfileInput>;

export interface PayLine {
  label: string;
  amount: number;
  kind: "earning" | "deduction";
}

export interface PayslipRow {
  id: string;
  runId: string;
  month: string;
  membershipId: string;
  staffName: string;
  lines: PayLine[];
  gross: number;
  deductions: number;
  net: number;
  status: "draft" | "approved" | "paid";
  paidOn: string | null;
}

export interface StaffPay extends PayProfile {
  membershipId: string;
  name: string;
  configured: boolean;
}

const who = (ctx: AcademyContext) => ({ businessId: ctx.businessId, userId: ctx.userId });

function gate(ctx: AcademyContext) {
  requireModule(ctx, "payroll");
  requirePermission(ctx, "payroll.manage");
  // Gaji seluruh akademi: staf yang dibatasi cabang tidak mengelolanya.
  if (ctx.branchIds !== null) throw forbidden();
}

function audit(ctx: AcademyContext, tx: Tx, action: string, targetId: string, meta: Record<string, unknown> = {}) {
  return tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action, targetType: "payroll", targetId, meta });
}

export async function listPayProfiles(ctx: AcademyContext): Promise<StaffPay[]> {
  gate(ctx);
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT m.id AS "membershipId", u.name, p.membership_id IS NOT NULL AS configured,
        coalesce(p.base_salary, 0) AS "baseSalary", coalesce(p.per_session, 0) AS "perSession", coalesce(p.allowance, 0) AS allowance,
        coalesce(p.overtime_per_hour, 0) AS "overtimePerHour", coalesce(p.late_deduction, 0) AS "lateDeduction",
        coalesce(p.unpaid_leave_deduction, 0) AS "unpaidLeaveDeduction"
      FROM core.memberships m JOIN core.users u ON u.id = m.user_id
      LEFT JOIN bola.pay_profiles p ON p.membership_id = m.id
      WHERE m.business_id = ${ctx.businessId}::uuid AND m.status = 'active'
      ORDER BY lower(u.name)`)) as unknown as StaffPay[],
  );
}

export async function setPayProfile(ctx: AcademyContext, membershipId: string, input: PayProfile): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [m] = (await tx.execute(sql`
      SELECT 1 AS x FROM core.memberships WHERE id = ${membershipId}::uuid AND business_id = ${ctx.businessId}::uuid AND status = 'active'`)) as unknown as unknown[];
    if (!m) throw notFound("Staf");
    await tx.execute(sql`
      INSERT INTO bola.pay_profiles (membership_id, business_id, base_salary, per_session, allowance, overtime_per_hour, late_deduction, unpaid_leave_deduction)
      VALUES (${membershipId}::uuid, ${ctx.businessId}::uuid, ${input.baseSalary}, ${input.perSession}, ${input.allowance},
              ${input.overtimePerHour}, ${input.lateDeduction}, ${input.unpaidLeaveDeduction})
      ON CONFLICT (membership_id) DO UPDATE SET base_salary = excluded.base_salary, per_session = excluded.per_session,
        allowance = excluded.allowance, overtime_per_hour = excluded.overtime_per_hour, late_deduction = excluded.late_deduction,
        unpaid_leave_deduction = excluded.unpaid_leave_deduction, updated_at = now()`);
    await audit(ctx, tx, "pay_profile.updated", membershipId);
  });
}

/** Menghitung slip satu staf untuk satu bulan dari profil gaji, sesi yang dilatih, dan rekap absensi. */
async function computeSlip(tx: Tx, month: string, p: StaffPay, totals: Awaited<ReturnType<typeof monthTotals>>): Promise<{ lines: PayLine[]; gross: number; deductions: number; net: number }> {
  const [s] = (await tx.execute(sql`
    SELECT count(*)::int AS n FROM bola.sessions s
    JOIN bola.team_coaches tc ON tc.team_id = s.team_id AND tc.membership_id = ${p.membershipId}::uuid
    JOIN core.businesses b ON b.id = s.business_id
    WHERE s.status = 'scheduled' AND s.ends_at < now()
      AND date_trunc('month', s.starts_at AT TIME ZONE b.timezone) = ${`${month}-01`}::date`)) as unknown as { n: number }[];
  const [leave] = (await tx.execute(sql`
    SELECT coalesce(sum(least(date_to, (${`${month}-01`}::date + interval '1 month' - interval '1 day')::date)
                        - greatest(date_from, ${`${month}-01`}::date) + 1), 0)::int AS d
    FROM bola.staff_requests WHERE membership_id = ${p.membershipId}::uuid AND kind = 'leave' AND leave_type = 'unpaid'
      AND status = 'approved' AND date_to >= ${`${month}-01`}::date AND date_from < (${`${month}-01`}::date + interval '1 month')`)) as unknown as { d: number }[];
  const t = totals.get(p.membershipId);
  const sessions = s!.n;
  const lines: PayLine[] = [
    { label: "Gaji pokok", amount: p.baseSalary, kind: "earning" },
    { label: `Honor melatih (${sessions} sesi)`, amount: sessions * p.perSession, kind: "earning" },
    { label: "Tunjangan", amount: p.allowance, kind: "earning" },
    { label: `Lembur (${Math.round(((t?.overtimeMinutes ?? 0) / 60) * 10) / 10} jam)`, amount: Math.round(((t?.overtimeMinutes ?? 0) / 60) * p.overtimePerHour), kind: "earning" },
    { label: `Potongan terlambat (${t?.lateDays ?? 0} kali)`, amount: (t?.lateDays ?? 0) * p.lateDeduction, kind: "deduction" },
    { label: `Potongan cuti tanpa gaji (${leave!.d} hari)`, amount: leave!.d * p.unpaidLeaveDeduction, kind: "deduction" },
  ].filter((l) => l.amount > 0) as PayLine[];
  const gross = lines.filter((l) => l.kind === "earning").reduce((a, l) => a + l.amount, 0);
  const deductions = Math.min(gross, lines.filter((l) => l.kind === "deduction").reduce((a, l) => a + l.amount, 0));
  return { lines, gross, deductions, net: gross - deductions };
}

/** Membuat atau menghitung ulang draf gaji bulan itu. Staf tanpa profil gaji dilewati. */
export async function prepareRun(ctx: AcademyContext, month: string): Promise<string> {
  gate(ctx);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new AppError(422, "invalid", "Bulan tidak valid.");
  const people = (await listPayProfiles(ctx)).filter((p) => p.configured);
  if (!people.length) throw new AppError(422, "no_profiles", "Atur gaji staf dulu di bagian Pengaturan gaji.");
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    if (`${month}-01` > today) throw new AppError(422, "invalid", "Gaji hanya bisa dihitung untuk bulan berjalan atau yang sudah lewat.");
    const [existing] = (await tx.execute(sql`SELECT id, status FROM bola.payroll_runs WHERE month = ${`${month}-01`}::date FOR UPDATE`)) as unknown as { id: string; status: string }[];
    if (existing && existing.status !== "draft") throw new AppError(409, "locked", "Gaji bulan ini sudah disetujui. Batalkan persetujuan dulu untuk menghitung ulang.");
    const runId =
      existing?.id ??
      ((await tx.execute(sql`
        INSERT INTO bola.payroll_runs (business_id, month, created_by) VALUES (${ctx.businessId}::uuid, ${`${month}-01`}::date, ${ctx.userId}::uuid)
        RETURNING id`)) as unknown as { id: string }[])[0]!.id;
    await tx.execute(sql`DELETE FROM bola.payslips WHERE run_id = ${runId}::uuid`);
    const totals = await monthTotals(tx, month, people.map((p) => p.membershipId));
    let total = 0;
    for (const p of people) {
      const slip = await computeSlip(tx, month, p, totals);
      total += slip.net;
      await tx.execute(sql`
        INSERT INTO bola.payslips (business_id, run_id, membership_id, staff_name, lines, gross, deductions, net)
        VALUES (${ctx.businessId}::uuid, ${runId}::uuid, ${p.membershipId}::uuid, ${p.name}, ${JSON.stringify(slip.lines)}::jsonb,
                ${slip.gross}, ${slip.deductions}, ${slip.net})`);
    }
    await tx.execute(sql`UPDATE bola.payroll_runs SET total = ${total} WHERE id = ${runId}::uuid`);
    await audit(ctx, tx, "payroll.prepared", runId, { month, total });
    return runId;
  });
}

/** Menyesuaikan satu slip draf (bonus atau potongan lain) sebelum disetujui. */
export async function adjustSlip(ctx: AcademyContext, slipId: string, line: PayLine): Promise<void> {
  gate(ctx);
  if (!line.label.trim() || line.amount <= 0) throw new AppError(422, "invalid", "Isi keterangan dan nominal.");
  await inAcademy(ctx, async (tx) => {
    const [s] = (await tx.execute(sql`
      SELECT p.lines, p.run_id AS "runId", r.status FROM bola.payslips p JOIN bola.payroll_runs r ON r.id = p.run_id
      WHERE p.id = ${slipId}::uuid FOR UPDATE OF p`)) as unknown as { lines: PayLine[]; runId: string; status: string }[];
    if (!s) throw notFound("Slip gaji");
    if (s.status !== "draft") throw new AppError(409, "locked", "Slip yang sudah disetujui tidak bisa diubah.");
    const lines = [...s.lines, { label: line.label.trim().slice(0, 60), amount: Math.round(line.amount), kind: line.kind }];
    const gross = lines.filter((l) => l.kind === "earning").reduce((a, l) => a + l.amount, 0);
    const deductions = Math.min(gross, lines.filter((l) => l.kind === "deduction").reduce((a, l) => a + l.amount, 0));
    await tx.execute(sql`
      UPDATE bola.payslips SET lines = ${JSON.stringify(lines)}::jsonb, gross = ${gross}, deductions = ${deductions}, net = ${gross - deductions}
      WHERE id = ${slipId}::uuid`);
    await tx.execute(sql`UPDATE bola.payroll_runs SET total = (SELECT coalesce(sum(net), 0) FROM bola.payslips WHERE run_id = ${s.runId}::uuid) WHERE id = ${s.runId}::uuid`);
    await audit(ctx, tx, "payslip.adjusted", slipId, { label: line.label, amount: line.amount, kind: line.kind });
  });
}

/** Menyetujui: beban gaji diakui (Gaji / Utang gaji) di akhir bulan gaji. */
export async function approveRun(ctx: AcademyContext, runId: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`
      SELECT status, total, to_char(month, 'YYYY-MM') AS month,
             to_char((month + interval '1 month' - interval '1 day'), 'YYYY-MM-DD') AS "endDate"
      FROM bola.payroll_runs WHERE id = ${runId}::uuid FOR UPDATE`)) as unknown as { status: string; total: number; month: string; endDate: string }[];
    if (!r) throw notFound("Gaji");
    if (r.status !== "draft") throw new AppError(409, "not_draft", "Gaji ini sudah disetujui.");
    const today = await academyToday(tx);
    await postJournal(tx, who(ctx), {
      date: r.endDate < today ? r.endDate : today,
      memo: `Gaji ${r.month.slice(5)}/${r.month.slice(0, 4)}`,
      source: "payroll",
      sourceId: runId,
      lines: [
        { account: { key: "salary" }, debit: r.total },
        { account: { key: "salary_payable" }, credit: r.total },
      ],
    });
    await tx.execute(sql`UPDATE bola.payroll_runs SET status = 'approved', approved_by = ${ctx.userId}::uuid, approved_at = now() WHERE id = ${runId}::uuid`);
    await audit(ctx, tx, "payroll.approved", runId, { total: r.total });
  });
}

/** Membatalkan persetujuan (sebelum dibayar): jurnal beban dibalik, kembali ke draf. */
export async function unapproveRun(ctx: AcademyContext, runId: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`SELECT status FROM bola.payroll_runs WHERE id = ${runId}::uuid FOR UPDATE`)) as unknown as { status: string }[];
    if (!r) throw notFound("Gaji");
    if (r.status !== "approved") throw new AppError(409, "not_approved", "Hanya gaji yang disetujui dan belum dibayar yang bisa dibatalkan.");
    await reverseSource(tx, who(ctx), "payroll", runId, await academyToday(tx));
    await tx.execute(sql`UPDATE bola.payroll_runs SET status = 'draft', approved_by = NULL, approved_at = NULL WHERE id = ${runId}::uuid`);
    await audit(ctx, tx, "payroll.unapproved", runId);
  });
}

/** Mencatat gaji dibayar (Utang gaji / Kas atau Bank). */
export async function payRun(ctx: AcademyContext, runId: string, paidOn: string, accountId?: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`
      SELECT status, total, to_char(month, 'YYYY-MM') AS month FROM bola.payroll_runs WHERE id = ${runId}::uuid FOR UPDATE`)) as unknown as { status: string; total: number; month: string }[];
    if (!r) throw notFound("Gaji");
    if (r.status !== "approved") throw new AppError(409, "not_approved", "Setujui gaji dulu sebelum dibayar.");
    if (paidOn > (await academyToday(tx))) throw new AppError(422, "invalid", "Tanggal bayar tidak boleh di masa depan.");
    const from = accountId ?? (await accountIdOf(tx, "bank"));
    const [acc] = (await tx.execute(sql`SELECT 1 AS x FROM bola.accounts WHERE id = ${from}::uuid AND is_cash AND archived_at IS NULL`)) as unknown as unknown[];
    if (!acc) throw new AppError(422, "invalid", "Pilih akun kas atau bank.");
    await postJournal(tx, who(ctx), {
      date: paidOn,
      memo: `Pembayaran gaji ${r.month.slice(5)}/${r.month.slice(0, 4)}`,
      source: "payroll_pay",
      sourceId: runId,
      lines: [
        { account: { key: "salary_payable" }, debit: r.total },
        { account: from, credit: r.total },
      ],
    });
    await tx.execute(sql`UPDATE bola.payroll_runs SET status = 'paid', paid_on = ${paidOn}::date, paid_from = ${from}::uuid WHERE id = ${runId}::uuid`);
    await audit(ctx, tx, "payroll.paid", runId, { total: r.total });
  });
}

export interface RunView {
  id: string;
  month: string;
  status: "draft" | "approved" | "paid";
  total: number;
  paidOn: string | null;
  slips: PayslipRow[];
}

export async function getRun(ctx: AcademyContext, month: string): Promise<RunView | null> {
  gate(ctx);
  return inAcademy(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`
      SELECT id, to_char(month, 'YYYY-MM') AS month, status, total, to_char(paid_on, 'YYYY-MM-DD') AS "paidOn"
      FROM bola.payroll_runs WHERE month = ${`${month}-01`}::date`)) as unknown as Omit<RunView, "slips">[];
    if (!r) return null;
    return { ...r, slips: await slipsWhere(tx, sql`p.run_id = ${r.id}::uuid`) };
  });
}

async function slipsWhere(tx: Tx, where: ReturnType<typeof sql>): Promise<PayslipRow[]> {
  return (await tx.execute(sql`
    SELECT p.id, p.run_id AS "runId", to_char(r.month, 'YYYY-MM') AS month, p.membership_id AS "membershipId", p.staff_name AS "staffName",
           p.lines, p.gross, p.deductions, p.net, r.status, to_char(r.paid_on, 'YYYY-MM-DD') AS "paidOn"
    FROM bola.payslips p JOIN bola.payroll_runs r ON r.id = p.run_id
    WHERE ${where} ORDER BY r.month DESC, lower(p.staff_name)`)) as unknown as PayslipRow[];
}

/** Slip gaji milik staf yang sedang masuk (yang sudah disetujui atau dibayar). */
export async function mySlips(ctx: AcademyContext): Promise<PayslipRow[]> {
  if (!ctx.modules.has("payroll")) return [];
  return inAcademy(ctx, (tx) => slipsWhere(tx, sql`p.membership_id = ${ctx.membershipId}::uuid AND r.status <> 'draft'`));
}
