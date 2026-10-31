import "server-only";
import type { Tx } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { AppError } from "./errors";

/**
 * Inti pembukuan berpasangan. Semua modul (iuran, pengeluaran, gaji, stok, toko, event) mencatat
 * lewat `postJournal`; koreksi selalu lewat `reverseJournal`, tidak pernah mengubah jurnal lama.
 */

export type SystemKey =
  | "cash" | "bank" | "receivable" | "inventory" | "fixed_assets" | "accum_depreciation"
  | "payable" | "salary_payable" | "capital" | "retained"
  | "fee_income" | "event_income" | "sales" | "other_income"
  | "salary" | "rent" | "equipment" | "depreciation" | "cogs" | "stock_adjustment" | "other_expense";

export interface Line {
  /** id akun, atau kunci akun sistem. */
  account: string | { key: SystemKey };
  debit?: number;
  credit?: number;
  branchId?: string | null;
}

export interface JournalDraft {
  date: string;
  memo: string;
  source: string;
  sourceId?: string | null;
  lines: Line[];
}

interface Actor {
  businessId: string;
  userId: string | null;
}

const cache = new WeakMap<Tx, Map<string, string>>();

export async function accountIdOf(tx: Tx, key: SystemKey): Promise<string> {
  let m = cache.get(tx);
  if (!m) cache.set(tx, (m = new Map()));
  const hit = m.get(key);
  if (hit) return hit;
  const [row] = (await tx.execute(sql`SELECT id FROM bola.accounts WHERE system_key = ${key}`)) as unknown as { id: string }[];
  if (!row) throw new AppError(409, "no_account", "Bagan akun belum lengkap. Hubungi dukungan.");
  m.set(key, row.id);
  return row.id;
}

/** Mengubah galat database pembukuan menjadi pesan yang bisa dipahami. */
export function ledgerError(e: unknown): never {
  const msg = (e as { cause?: { message?: string }; message?: string })?.cause?.message ?? (e as Error)?.message ?? "";
  if (msg.includes("period_locked")) throw new AppError(409, "period_locked", "Bulan ini sudah ditutup bukunya. Catat di bulan berjalan, atau minta Pemilik membuka tutup buku.");
  if (msg.includes("journal_unbalanced")) throw new AppError(422, "unbalanced", "Debit dan kredit harus sama besar.");
  throw e;
}

/** Mencatat satu jurnal seimbang. Baris bernilai 0 dibuang. Mengembalikan id jurnal, atau null bila kosong. */
export async function postJournal(tx: Tx, actor: Actor, j: JournalDraft): Promise<string | null> {
  const lines = j.lines
    .map((l) => ({ ...l, debit: Math.round(l.debit ?? 0), credit: Math.round(l.credit ?? 0) }))
    .filter((l) => l.debit > 0 || l.credit > 0);
  if (!lines.length) return null;
  const d = lines.reduce((s, l) => s + l.debit, 0);
  const c = lines.reduce((s, l) => s + l.credit, 0);
  if (d !== c) throw new AppError(422, "unbalanced", "Debit dan kredit harus sama besar.");
  try {
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.journals (business_id, entry_date, memo, source, source_id, created_by)
      VALUES (${actor.businessId}::uuid, ${j.date}::date, ${j.memo.slice(0, 200)}, ${j.source}, ${j.sourceId ?? null}::uuid, ${actor.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    for (const l of lines) {
      const accountId = typeof l.account === "string" ? l.account : await accountIdOf(tx, l.account.key);
      // Baris debit dan kredit dipisah bila keduanya terisi.
      for (const [debit, credit] of [[l.debit, 0], [0, l.credit]] as const) {
        if (!debit && !credit) continue;
        await tx.execute(sql`
          INSERT INTO bola.journal_lines (business_id, journal_id, account_id, debit, credit, branch_id)
          VALUES (${actor.businessId}::uuid, ${row!.id}::uuid, ${accountId}::uuid, ${debit}, ${credit}, ${l.branchId ?? null}::uuid)`);
      }
    }
    return row!.id;
  } catch (e) {
    ledgerError(e);
  }
}

/** Jurnal balik untuk satu jurnal (tanggal hari ini kecuali diberikan). Idempoten: yang sudah dibalik dilewati. */
export async function reverseJournal(tx: Tx, actor: Actor, journalId: string, date: string, memo?: string): Promise<string | null> {
  const [j] = (await tx.execute(sql`
    SELECT id, memo, source, source_id AS "sourceId", reversed_by AS "reversedBy", reversal_of AS "reversalOf"
    FROM bola.journals WHERE id = ${journalId}::uuid FOR UPDATE`)) as unknown as {
    id: string; memo: string; source: string; sourceId: string | null; reversedBy: string | null; reversalOf: string | null;
  }[];
  if (!j || j.reversedBy || j.reversalOf) return null;
  const lines = (await tx.execute(sql`
    SELECT account_id AS "accountId", debit::int AS debit, credit::int AS credit, branch_id AS "branchId"
    FROM bola.journal_lines WHERE journal_id = ${journalId}::uuid`)) as unknown as { accountId: string; debit: number; credit: number; branchId: string | null }[];
  try {
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.journals (business_id, entry_date, memo, source, source_id, reversal_of, created_by)
      VALUES (${actor.businessId}::uuid, ${date}::date, ${(memo ?? `Batal: ${j.memo}`).slice(0, 200)}, ${j.source}, ${j.sourceId}::uuid, ${j.id}::uuid, ${actor.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    for (const l of lines) {
      await tx.execute(sql`
        INSERT INTO bola.journal_lines (business_id, journal_id, account_id, debit, credit, branch_id)
        VALUES (${actor.businessId}::uuid, ${row!.id}::uuid, ${l.accountId}::uuid, ${l.credit}, ${l.debit}, ${l.branchId}::uuid)`);
    }
    await tx.execute(sql`UPDATE bola.journals SET reversed_by = ${row!.id}::uuid WHERE id = ${j.id}::uuid`);
    return row!.id;
  } catch (e) {
    ledgerError(e);
  }
}

/** Membalik semua jurnal aktif (belum dibalik, bukan pembalik) milik satu sumber. */
export async function reverseSource(tx: Tx, actor: Actor, source: string, sourceId: string, date: string): Promise<void> {
  const rows = (await tx.execute(sql`
    SELECT id FROM bola.journals WHERE source = ${source} AND source_id = ${sourceId}::uuid
      AND reversed_by IS NULL AND reversal_of IS NULL`)) as unknown as { id: string }[];
  for (const r of rows) await reverseJournal(tx, actor, r.id, date);
}

/** Bulan dikunci? (untuk pesan ramah sebelum mencoba menulis). */
export async function isLocked(tx: Tx, date: string): Promise<boolean> {
  const rows = (await tx.execute(sql`
    SELECT 1 AS x FROM bola.period_locks WHERE month = date_trunc('month', ${date}::date)::date`)) as unknown as unknown[];
  return rows.length > 0;
}
