import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { AccountInput, ExpenseInput, ManualJournalInput, ReconcileInput, ScholarshipInput } from "@/lib/schemas";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { postJournal, reverseJournal, reverseSource } from "./ledger";
import { academyToday } from "./schedule";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export const TYPE_LABEL: Record<AccountType, string> = {
  asset: "Harta",
  liability: "Utang",
  equity: "Modal",
  income: "Pendapatan",
  expense: "Biaya",
};
/** Saldo normal: harta dan biaya bertambah di debit, sisanya di kredit. */
const debitNormal = (t: AccountType) => t === "asset" || t === "expense";

const who = (ctx: AcademyContext) => ({ businessId: ctx.businessId, userId: ctx.userId });

/** Keuangan berlaku untuk seluruh akademi, jadi staf yang dibatasi cabang tidak membukanya. */
function gate(ctx: AcademyContext, p: "accounting.read" | "accounting.manage" | "accounting.close") {
  requireModule(ctx, "accounting");
  requirePermission(ctx, p);
  if (ctx.branchIds !== null) throw forbidden();
}

function audit(ctx: AcademyContext, tx: Tx, action: string, targetType: string, targetId: string, meta: Record<string, unknown> = {}) {
  return tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action, targetType, targetId, meta });
}

// ---------- Akun ----------

export interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isCash: boolean;
  systemKey: string | null;
  archived: boolean;
  balance: number;
}

export async function listAccounts(ctx: AcademyContext, opts: { includeArchived?: boolean } = {}): Promise<AccountRow[]> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT a.id, a.code, a.name, a.type, a.is_cash AS "isCash", a.system_key AS "systemKey", a.archived_at IS NOT NULL AS archived,
        coalesce((SELECT sum(l.debit - l.credit) FROM bola.journal_lines l WHERE l.account_id = a.id), 0)::bigint AS raw
      FROM bola.accounts a
      ${opts.includeArchived ? sql`` : sql`WHERE a.archived_at IS NULL`}
      ORDER BY a.code`)) as unknown as (Omit<AccountRow, "balance"> & { raw: string })[];
    return rows.map(({ raw, ...r }) => ({ ...r, balance: debitNormal(r.type) ? Number(raw) : -Number(raw) }));
  });
}

/** Pilihan akun ringkas untuk form (tanpa saldo). */
export async function accountOptions(ctx: AcademyContext): Promise<{ id: string; code: string; name: string; type: AccountType; isCash: boolean }[]> {
  if (!ctx.modules.has("accounting") || !ctx.can("accounting.read") || ctx.branchIds !== null) return [];
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT id, code, name, type, is_cash AS "isCash" FROM bola.accounts WHERE archived_at IS NULL ORDER BY code`)) as unknown as {
      id: string; code: string; name: string; type: AccountType; isCash: boolean;
    }[],
  );
}

const dupCode = (e: unknown) => {
  if ((e as { cause?: { code?: string } })?.cause?.code === "23505") throw new AppError(409, "duplicate", "Kode akun sudah dipakai.", { code: "Kode akun sudah dipakai." });
  throw e;
};

export async function createAccount(ctx: AcademyContext, input: z.infer<typeof AccountInput>): Promise<string> {
  gate(ctx, "accounting.manage");
  return inAcademy(ctx, async (tx) => {
    const [row] = (await tx
      .execute(sql`
        INSERT INTO bola.accounts (business_id, code, name, type, is_cash)
        VALUES (${ctx.businessId}::uuid, ${input.code}, ${input.name}, ${input.type}::bola.account_type, ${input.isCash && input.type === "asset"})
        RETURNING id`)
      .catch(dupCode)) as unknown as { id: string }[];
    await audit(ctx, tx, "account.created", "account", row!.id, { code: input.code, name: input.name });
    return row!.id;
  });
}

/** Nama dan kode boleh diubah; jenis akun tidak (supaya laporan lama tetap benar). */
export async function updateAccount(ctx: AcademyContext, id: string, input: Pick<z.infer<typeof AccountInput>, "code" | "name">): Promise<void> {
  gate(ctx, "accounting.manage");
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx
      .execute(sql`UPDATE bola.accounts SET code = ${input.code}, name = ${input.name} WHERE id = ${id}::uuid RETURNING id`)
      .catch(dupCode)) as unknown as unknown[];
    if (!rows.length) throw notFound("Akun");
    await audit(ctx, tx, "account.updated", "account", id);
  });
}

export async function archiveAccount(ctx: AcademyContext, id: string): Promise<void> {
  gate(ctx, "accounting.manage");
  await inAcademy(ctx, async (tx) => {
    const [a] = (await tx.execute(sql`
      SELECT system_key AS "systemKey",
        coalesce((SELECT sum(debit - credit) FROM bola.journal_lines WHERE account_id = ${id}::uuid), 0)::bigint AS bal
      FROM bola.accounts WHERE id = ${id}::uuid`)) as unknown as { systemKey: string | null; bal: string }[];
    if (!a) throw notFound("Akun");
    if (a.systemKey) throw new AppError(409, "system", "Akun ini dipakai otomatis oleh aplikasi dan tidak bisa diarsipkan.");
    if (Number(a.bal) !== 0) throw new AppError(409, "has_balance", "Saldo akun ini belum nol. Pindahkan saldonya dulu lewat jurnal.");
    await tx.execute(sql`UPDATE bola.accounts SET archived_at = now() WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "account.archived", "account", id);
  });
}

async function assertAccount(tx: Tx, id: string, opts: { cash?: boolean; types?: AccountType[] } = {}) {
  const [a] = (await tx.execute(sql`
    SELECT type, is_cash AS "isCash" FROM bola.accounts WHERE id = ${id}::uuid AND archived_at IS NULL`)) as unknown as { type: AccountType; isCash: boolean }[];
  if (!a || (opts.cash && !a.isCash) || (opts.types && !opts.types.includes(a.type))) return false;
  return true;
}

// ---------- Pengeluaran ----------

export interface ExpenseRow {
  id: string;
  spentOn: string;
  accountName: string;
  paidFromName: string;
  amount: number;
  vendor: string | null;
  note: string;
  branchName: string | null;
  voided: boolean;
}

export async function listExpenses(ctx: AcademyContext, month: string): Promise<ExpenseRow[]> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT e.id, to_char(e.spent_on, 'YYYY-MM-DD') AS "spentOn", a.name AS "accountName", f.name AS "paidFromName",
             e.amount, e.vendor, e.note, b.name AS "branchName", e.voided_at IS NOT NULL AS voided
      FROM bola.expenses e
      JOIN bola.accounts a ON a.id = e.account_id
      JOIN bola.accounts f ON f.id = e.paid_from
      LEFT JOIN bola.branches b ON b.id = e.branch_id
      WHERE date_trunc('month', e.spent_on) = ${`${month}-01`}::date
      ORDER BY e.spent_on DESC, e.created_at DESC`)) as unknown as ExpenseRow[],
  );
}

export async function createExpense(ctx: AcademyContext, input: z.infer<typeof ExpenseInput>): Promise<string> {
  gate(ctx, "accounting.manage");
  return inAcademy(ctx, async (tx) => {
    if (input.spentOn > (await academyToday(tx))) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { spentOn: "Tanggal tidak boleh di masa depan." });
    if (!(await assertAccount(tx, input.accountId, { types: ["expense", "asset"] }))) {
      throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { accountId: "Pilih jenis biaya." });
    }
    if (!(await assertAccount(tx, input.paidFrom, { cash: true }))) {
      throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { paidFrom: "Pilih akun kas atau bank." });
    }
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.expenses (business_id, spent_on, account_id, paid_from, amount, vendor, note, branch_id, recorded_by)
      VALUES (${ctx.businessId}::uuid, ${input.spentOn}::date, ${input.accountId}::uuid, ${input.paidFrom}::uuid, ${input.amount},
              ${input.vendor ?? null}, ${input.note}, ${input.branchId ?? null}::uuid, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    const journalId = await postJournal(tx, who(ctx), {
      date: input.spentOn,
      memo: `${input.note}${input.vendor ? ` (${input.vendor})` : ""}`,
      source: "expense",
      sourceId: row!.id,
      lines: [
        { account: input.accountId, debit: input.amount, branchId: input.branchId ?? null },
        { account: input.paidFrom, credit: input.amount, branchId: input.branchId ?? null },
      ],
    });
    await tx.execute(sql`UPDATE bola.expenses SET journal_id = ${journalId}::uuid WHERE id = ${row!.id}::uuid`);
    await audit(ctx, tx, "expense.created", "expense", row!.id, { amount: input.amount });
    return row!.id;
  });
}

/** Membatalkan pengeluaran: jurnalnya dibalik hari ini. */
export async function voidExpense(ctx: AcademyContext, id: string): Promise<void> {
  gate(ctx, "accounting.manage");
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE bola.expenses SET voided_at = now() WHERE id = ${id}::uuid AND voided_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Pengeluaran");
    await reverseSource(tx, who(ctx), "expense", id, await academyToday(tx));
    await audit(ctx, tx, "expense.voided", "expense", id);
  });
}

// ---------- Jurnal ----------

export interface JournalRow {
  id: string;
  entryDate: string;
  memo: string;
  source: string;
  reversed: boolean;
  isReversal: boolean;
  total: number;
  lines: { accountId: string; code: string; name: string; debit: number; credit: number }[];
}

export async function listJournals(ctx: AcademyContext, from: string, to: string): Promise<JournalRow[]> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const js = (await tx.execute(sql`
      SELECT j.id, to_char(j.entry_date, 'YYYY-MM-DD') AS "entryDate", j.memo, j.source,
             j.reversed_by IS NOT NULL AS reversed, j.reversal_of IS NOT NULL AS "isReversal"
      FROM bola.journals j WHERE j.entry_date BETWEEN ${from}::date AND ${to}::date
      ORDER BY j.entry_date DESC, j.created_at DESC LIMIT 300`)) as unknown as Omit<JournalRow, "lines" | "total">[];
    if (!js.length) return [];
    const lines = (await tx.execute(sql`
      SELECT l.journal_id AS "journalId", l.account_id AS "accountId", a.code, a.name, l.debit::int AS debit, l.credit::int AS credit
      FROM bola.journal_lines l JOIN bola.accounts a ON a.id = l.account_id
      WHERE l.journal_id = ANY (${`{${js.map((j) => j.id).join(",")}}`}::uuid[])
      ORDER BY l.debit DESC`)) as unknown as (JournalRow["lines"][number] & { journalId: string })[];
    return js.map((j) => {
      const mine = lines.filter((l) => l.journalId === j.id).map(({ journalId: _j, ...l }) => l);
      return { ...j, lines: mine, total: mine.reduce((s, l) => s + l.debit, 0) };
    });
  });
}

export async function createManualJournal(ctx: AcademyContext, input: z.infer<typeof ManualJournalInput>): Promise<string> {
  gate(ctx, "accounting.manage");
  return inAcademy(ctx, async (tx) => {
    for (const l of input.lines) {
      if (!(await assertAccount(tx, l.accountId))) throw new AppError(422, "invalid", "Ada akun yang tidak ditemukan.");
      if ((l.debit > 0) === (l.credit > 0)) throw new AppError(422, "invalid", "Tiap baris isi debit atau kredit saja.");
    }
    const id = await postJournal(tx, who(ctx), {
      date: input.date,
      memo: input.memo,
      source: "manual",
      lines: input.lines.map((l) => ({ account: l.accountId, debit: l.debit, credit: l.credit })),
    });
    if (!id) throw new AppError(422, "invalid", "Jurnal kosong.");
    await audit(ctx, tx, "journal.created", "journal", id);
    return id;
  });
}

/** Hanya jurnal manual yang dibalik langsung; jurnal otomatis dibatalkan dari modul asalnya. */
export async function reverseManualJournal(ctx: AcademyContext, id: string): Promise<void> {
  gate(ctx, "accounting.manage");
  await inAcademy(ctx, async (tx) => {
    const [j] = (await tx.execute(sql`SELECT source FROM bola.journals WHERE id = ${id}::uuid`)) as unknown as { source: string }[];
    if (!j) throw notFound("Jurnal");
    if (j.source !== "manual") throw new AppError(409, "auto", "Jurnal otomatis dibatalkan dari menu asalnya (iuran, pengeluaran, gaji, dan seterusnya).");
    const r = await reverseJournal(tx, who(ctx), id, await academyToday(tx));
    if (!r) throw new AppError(409, "reversed", "Jurnal ini sudah dibalik.");
    await audit(ctx, tx, "journal.reversed", "journal", id);
  });
}

// ---------- Laporan ----------

interface Bal {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  isCash: boolean;
  debit: number;
  credit: number;
}

async function balances(tx: Tx, from: string | null, to: string): Promise<Bal[]> {
  return (
    (await tx.execute(sql`
      SELECT a.id, a.code, a.name, a.type, a.is_cash AS "isCash",
        coalesce(sum(l.debit), 0)::bigint AS debit, coalesce(sum(l.credit), 0)::bigint AS credit
      FROM bola.accounts a
      LEFT JOIN bola.journal_lines l ON l.account_id = a.id
        AND l.journal_id IN (SELECT id FROM bola.journals WHERE entry_date <= ${to}::date ${from ? sql`AND entry_date >= ${from}::date` : sql``})
      GROUP BY a.id ORDER BY a.code`)) as unknown as (Omit<Bal, "debit" | "credit"> & { debit: string; credit: string })[]
  ).map((r) => ({ ...r, debit: Number(r.debit), credit: Number(r.credit) }));
}

const signed = (b: Bal) => (debitNormal(b.type) ? b.debit - b.credit : b.credit - b.debit);

export interface TrialBalance {
  asOf: string;
  rows: { code: string; name: string; type: AccountType; debit: number; credit: number }[];
  totalDebit: number;
  totalCredit: number;
}

export async function trialBalance(ctx: AcademyContext, asOf: string): Promise<TrialBalance> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const rows = (await balances(tx, null, asOf))
      .map((b) => {
        const net = b.debit - b.credit;
        return { code: b.code, name: b.name, type: b.type, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
      })
      .filter((r) => r.debit || r.credit);
    return { asOf, rows, totalDebit: rows.reduce((s, r) => s + r.debit, 0), totalCredit: rows.reduce((s, r) => s + r.credit, 0) };
  });
}

export interface ProfitLoss {
  from: string;
  to: string;
  income: { name: string; amount: number }[];
  expense: { name: string; amount: number }[];
  totalIncome: number;
  totalExpense: number;
  net: number;
}

export async function profitLoss(ctx: AcademyContext, from: string, to: string): Promise<ProfitLoss> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const bs = await balances(tx, from, to);
    const pick = (t: AccountType) => bs.filter((b) => b.type === t).map((b) => ({ name: b.name, amount: signed(b) })).filter((x) => x.amount !== 0);
    const income = pick("income");
    const expense = pick("expense");
    const totalIncome = income.reduce((s, x) => s + x.amount, 0);
    const totalExpense = expense.reduce((s, x) => s + x.amount, 0);
    return { from, to, income, expense, totalIncome, totalExpense, net: totalIncome - totalExpense };
  });
}

export interface BalanceSheet {
  asOf: string;
  assets: { name: string; amount: number }[];
  liabilities: { name: string; amount: number }[];
  equity: { name: string; amount: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
}

export async function balanceSheet(ctx: AcademyContext, asOf: string): Promise<BalanceSheet> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const bs = await balances(tx, null, asOf);
    const pick = (t: AccountType) => bs.filter((b) => b.type === t).map((b) => ({ name: b.name, amount: signed(b) })).filter((x) => x.amount !== 0);
    const earnings = bs.filter((b) => b.type === "income").reduce((s, b) => s + signed(b), 0) - bs.filter((b) => b.type === "expense").reduce((s, b) => s + signed(b), 0);
    const assets = pick("asset");
    const liabilities = pick("liability");
    const equity = [...pick("equity"), ...(earnings ? [{ name: "Laba (rugi) berjalan", amount: earnings }] : [])];
    const totalAssets = assets.reduce((s, x) => s + x.amount, 0);
    const totalLiabilities = liabilities.reduce((s, x) => s + x.amount, 0);
    const totalEquity = equity.reduce((s, x) => s + x.amount, 0);
    return { asOf, assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced: totalAssets === totalLiabilities + totalEquity };
  });
}

export interface CashFlow {
  from: string;
  to: string;
  opening: number;
  closing: number;
  groups: { label: string; amount: number }[];
  accounts: { name: string; opening: number; closing: number }[];
}

/** Arus kas metode langsung: mutasi akun kas/bank dikelompokkan menurut sumber transaksinya. */
export async function cashFlow(ctx: AcademyContext, from: string, to: string): Promise<CashFlow> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT j.source, sum(l.debit - l.credit)::bigint AS amount
      FROM bola.journal_lines l JOIN bola.journals j ON j.id = l.journal_id JOIN bola.accounts a ON a.id = l.account_id
      WHERE a.is_cash AND j.entry_date BETWEEN ${from}::date AND ${to}::date
        -- Pindah dana antar kas/bank tidak dihitung sebagai arus masuk/keluar.
        AND EXISTS (SELECT 1 FROM bola.journal_lines o JOIN bola.accounts oa ON oa.id = o.account_id WHERE o.journal_id = j.id AND NOT oa.is_cash)
      GROUP BY j.source`)) as unknown as { source: string; amount: string }[];
    const LABEL: Record<string, string> = {
      payment: "Iuran diterima",
      expense: "Pengeluaran operasional",
      payroll: "Gaji dibayar",
      purchase: "Pembelian barang",
      sale: "Penjualan toko",
      event: "Pendaftaran event",
      asset: "Pembelian aset",
      manual: "Jurnal manual",
    };
    const accts = (await tx.execute(sql`
      SELECT a.name,
        coalesce(sum(l.debit - l.credit) FILTER (WHERE j.entry_date < ${from}::date), 0)::bigint AS opening,
        coalesce(sum(l.debit - l.credit) FILTER (WHERE j.entry_date <= ${to}::date), 0)::bigint AS closing
      FROM bola.accounts a
      LEFT JOIN bola.journal_lines l ON l.account_id = a.id
      LEFT JOIN bola.journals j ON j.id = l.journal_id
      WHERE a.is_cash AND a.archived_at IS NULL
      GROUP BY a.id ORDER BY a.code`)) as unknown as { name: string; opening: string; closing: string }[];
    const accounts = accts.map((a) => ({ name: a.name, opening: Number(a.opening), closing: Number(a.closing) }));
    return {
      from,
      to,
      opening: accounts.reduce((s, a) => s + a.opening, 0),
      closing: accounts.reduce((s, a) => s + a.closing, 0),
      groups: rows.map((r) => ({ label: LABEL[r.source] ?? r.source, amount: Number(r.amount) })).filter((g) => g.amount !== 0).sort((a, b) => b.amount - a.amount),
      accounts,
    };
  });
}

export interface LedgerEntry {
  lineId: string;
  date: string;
  memo: string;
  debit: number;
  credit: number;
  balance: number;
  cleared: boolean;
}

export async function generalLedger(ctx: AcademyContext, accountId: string, from: string, to: string): Promise<{ account: { name: string; code: string; type: AccountType }; opening: number; entries: LedgerEntry[] }> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const [account] = (await tx.execute(sql`SELECT name, code, type FROM bola.accounts WHERE id = ${accountId}::uuid`)) as unknown as { name: string; code: string; type: AccountType }[];
    if (!account) throw notFound("Akun");
    const sign = debitNormal(account.type) ? 1 : -1;
    const [op] = (await tx.execute(sql`
      SELECT coalesce(sum(l.debit - l.credit), 0)::bigint AS v FROM bola.journal_lines l JOIN bola.journals j ON j.id = l.journal_id
      WHERE l.account_id = ${accountId}::uuid AND j.entry_date < ${from}::date`)) as unknown as { v: string }[];
    const rows = (await tx.execute(sql`
      SELECT l.id AS "lineId", to_char(j.entry_date, 'YYYY-MM-DD') AS date, j.memo, l.debit::bigint AS debit, l.credit::bigint AS credit,
             EXISTS (SELECT 1 FROM bola.cleared_lines c WHERE c.line_id = l.id) AS cleared
      FROM bola.journal_lines l JOIN bola.journals j ON j.id = l.journal_id
      WHERE l.account_id = ${accountId}::uuid AND j.entry_date BETWEEN ${from}::date AND ${to}::date
      ORDER BY j.entry_date, j.created_at LIMIT 1000`)) as unknown as { lineId: string; date: string; memo: string; debit: string; credit: string; cleared: boolean }[];
    let running = sign * Number(op!.v);
    const opening = running;
    const entries = rows.map((r) => {
      running += sign * (Number(r.debit) - Number(r.credit));
      return { ...r, debit: Number(r.debit), credit: Number(r.credit), balance: running };
    });
    return { account, opening, entries };
  });
}

export interface AgingRow {
  playerId: string;
  fullName: string;
  guardianPhone: string | null;
  buckets: [number, number, number, number];
  total: number;
}

/** Umur piutang iuran: sisa tagihan menurut lama sejak awal bulan tagihan (0-30, 31-60, 61-90, >90 hari). */
export async function receivablesAging(ctx: AcademyContext, asOf: string): Promise<{ asOf: string; rows: AgingRow[]; totals: [number, number, number, number]; total: number }> {
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.read");
  if (ctx.branchIds !== null) throw forbidden();
  return inAcademy(ctx, async (tx) => {
    const showPhone = ctx.can("guardians.read");
    const raw = (await tx.execute(sql`
      SELECT p.id AS "playerId", p.full_name AS "fullName", ${showPhone ? sql`p.guardian_phone` : sql`NULL`} AS "guardianPhone",
             (${asOf}::date - i.period) AS age,
             (i.amount - i.discount - coalesce((SELECT sum(x.amount) FROM bola.payments x WHERE x.invoice_id = i.id AND x.voided_at IS NULL), 0))::int AS due
      FROM bola.invoices i JOIN bola.players p ON p.id = i.player_id
      WHERE i.status = 'unpaid' AND i.period <= ${asOf}::date`)) as unknown as { playerId: string; fullName: string; guardianPhone: string | null; age: number; due: number }[];
    const map = new Map<string, AgingRow>();
    for (const r of raw) {
      if (r.due <= 0) continue;
      const row = map.get(r.playerId) ?? { playerId: r.playerId, fullName: r.fullName, guardianPhone: r.guardianPhone, buckets: [0, 0, 0, 0], total: 0 };
      const b = r.age <= 30 ? 0 : r.age <= 60 ? 1 : r.age <= 90 ? 2 : 3;
      row.buckets[b] += r.due;
      row.total += r.due;
      map.set(r.playerId, row);
    }
    const rows = [...map.values()].sort((a, b) => b.total - a.total);
    const totals = [0, 1, 2, 3].map((i) => rows.reduce((s, r) => s + r.buckets[i]!, 0)) as [number, number, number, number];
    return { asOf, rows, totals, total: totals.reduce((a, b) => a + b, 0) };
  });
}

// ---------- Tutup buku ----------

export async function listLocks(ctx: AcademyContext): Promise<string[]> {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) =>
    ((await tx.execute(sql`SELECT to_char(month, 'YYYY-MM') AS m FROM bola.period_locks ORDER BY month DESC`)) as unknown as { m: string }[]).map((r) => r.m),
  );
}

export async function setLock(ctx: AcademyContext, month: string, locked: boolean): Promise<void> {
  gate(ctx, "accounting.close");
  await inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    if (locked && month >= today.slice(0, 7)) throw new AppError(422, "invalid", "Hanya bulan yang sudah lewat yang bisa ditutup.");
    if (locked) {
      await tx.execute(sql`
        INSERT INTO bola.period_locks (business_id, month, closed_by) VALUES (${ctx.businessId}::uuid, ${`${month}-01`}::date, ${ctx.userId}::uuid)
        ON CONFLICT DO NOTHING`);
    } else {
      await tx.execute(sql`DELETE FROM bola.period_locks WHERE month = ${`${month}-01`}::date`);
    }
    await audit(ctx, tx, locked ? "period.closed" : "period.reopened", "period", month);
  });
}

// ---------- Rekonsiliasi kas/bank ----------

export async function reconcile(ctx: AcademyContext, input: z.infer<typeof ReconcileInput>): Promise<{ difference: number }> {
  gate(ctx, "accounting.manage");
  return inAcademy(ctx, async (tx) => {
    if (!(await assertAccount(tx, input.accountId, { cash: true }))) throw notFound("Akun kas/bank");
    if (input.lineIds.length) {
      await tx.execute(sql`
        INSERT INTO bola.cleared_lines (business_id, line_id, cleared_by)
        SELECT ${ctx.businessId}::uuid, l.id, ${ctx.userId}::uuid FROM bola.journal_lines l JOIN bola.journals j ON j.id = l.journal_id
        WHERE l.id = ANY (${`{${input.lineIds.join(",")}}`}::uuid[]) AND l.account_id = ${input.accountId}::uuid
          AND j.entry_date <= ${input.statementDate}::date
        ON CONFLICT DO NOTHING`);
    }
    const [c] = (await tx.execute(sql`
      SELECT coalesce(sum(l.debit - l.credit), 0)::bigint AS v FROM bola.journal_lines l
      JOIN bola.cleared_lines c ON c.line_id = l.id WHERE l.account_id = ${input.accountId}::uuid`)) as unknown as { v: string }[];
    const cleared = Number(c!.v);
    await tx.execute(sql`
      INSERT INTO bola.reconciliations (business_id, account_id, statement_date, statement_balance, cleared_balance, created_by)
      VALUES (${ctx.businessId}::uuid, ${input.accountId}::uuid, ${input.statementDate}::date, ${input.statementBalance}, ${cleared}, ${ctx.userId}::uuid)`);
    await audit(ctx, tx, "account.reconciled", "account", input.accountId, { difference: input.statementBalance - cleared });
    return { difference: input.statementBalance - cleared };
  });
}

export async function lastReconciliation(ctx: AcademyContext, accountId: string) {
  gate(ctx, "accounting.read");
  return inAcademy(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`
      SELECT to_char(statement_date, 'YYYY-MM-DD') AS date, statement_balance::bigint AS statement, cleared_balance::bigint AS cleared
      FROM bola.reconciliations WHERE account_id = ${accountId}::uuid ORDER BY created_at DESC LIMIT 1`)) as unknown as { date: string; statement: string; cleared: string }[];
    return r ? { date: r.date, statement: Number(r.statement), cleared: Number(r.cleared), difference: Number(r.statement) - Number(r.cleared) } : null;
  });
}

// ---------- Beasiswa ----------

export interface ScholarshipRow {
  id: string;
  playerId: string;
  fullName: string;
  kind: "percent" | "amount";
  value: number;
  reason: string;
  startsOn: string;
  endsOn: string | null;
  active: boolean;
}

export async function listScholarships(ctx: AcademyContext): Promise<ScholarshipRow[]> {
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.read");
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT s.id, s.player_id AS "playerId", p.full_name AS "fullName", s.kind, s.value, s.reason,
             to_char(s.starts_on, 'YYYY-MM-DD') AS "startsOn", to_char(s.ends_on, 'YYYY-MM-DD') AS "endsOn",
             (s.ends_on IS NULL OR s.ends_on >= current_date) AS active
      FROM bola.scholarships s JOIN bola.players p ON p.id = s.player_id
      WHERE s.archived_at IS NULL ORDER BY p.full_name`)) as unknown as ScholarshipRow[],
  );
}

export async function createScholarship(ctx: AcademyContext, input: z.infer<typeof ScholarshipInput>): Promise<string> {
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.manage");
  if (input.kind === "percent" && input.value > 100) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { value: "Maksimal 100%." });
  if (input.endsOn && input.endsOn < input.startsOn) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { endsOn: "Harus setelah tanggal mulai." });
  return inAcademy(ctx, async (tx) => {
    const [p] = (await tx.execute(sql`SELECT 1 AS x FROM bola.players WHERE id = ${input.playerId}::uuid`)) as unknown as unknown[];
    if (!p) throw notFound("Pemain");
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.scholarships (business_id, player_id, kind, value, reason, starts_on, ends_on, created_by)
      VALUES (${ctx.businessId}::uuid, ${input.playerId}::uuid, ${input.kind}, ${input.value}, ${input.reason},
              ${input.startsOn}::date, ${input.endsOn ?? null}::date, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await audit(ctx, tx, "scholarship.created", "scholarship", row!.id, { playerId: input.playerId });
    return row!.id;
  });
}

export async function endScholarship(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.manage");
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE bola.scholarships SET archived_at = now() WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Beasiswa");
    await audit(ctx, tx, "scholarship.ended", "scholarship", id);
  });
}
