import "server-only";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { REPORT_DATE } from "./reports";

export const PAY_STATES = [["lunas", "Lunas"], ["sebagian", "Sebagian"], ["belum", "Belum bayar"], ["refund", "Direfund"], ["batal", "Dibatalkan"]] as const;
export type TxFilter = { from: string; to: string; state: string; method: string; cashierId: string | null; q: string; page: number };
export type TxRow = { id: string; receiptNo: string; at: string; typeName: string; tableName: string | null; customerName: string | null; cashier: string | null; total: number; paid: number; refunded: number; state: string; methods: string[] };
export type TxDetail = TxRow & {
  subtotal: number; discount: number; discountReason: string | null; service: number; tax: number; notes: string | null; cancelReason: string | null;
  lines: { name: string; qty: number; unitPrice: number; modifiers: string[]; notes: string | null }[];
  payments: { id: string; method: string; amount: number; tendered: number | null; at: string; voided: boolean; voidReason: string | null; by: string | null }[];
  refunds: { amount: number; method: string; reason: string; at: string; by: string | null }[];
  timeline: { at: string; label: string }[];
};
const PAGE = 30;
const METHOD = new Set(["cash", "transfer", "qris", "card", "other"]);
const need = (ctx: FnbContext) => { if (!can(ctx, "orders.sell") && !can(ctx, "cash.manage") && !can(ctx, "reports.read")) throw forbidden(); };

export function parseTxFilter(q: Record<string, string | undefined>, today: string): TxFilter {
  const to = q.sampai && REPORT_DATE.test(q.sampai) ? q.sampai : today;
  const from = q.dari && REPORT_DATE.test(q.dari) ? q.dari : to.slice(0, 8) + "01";
  if (from > to) throw new AppError(422, "invalid_date", "Tanggal awal tidak boleh setelah tanggal akhir.");
  return {
    from, to, state: PAY_STATES.some(([k]) => k === q.bayar) ? q.bayar! : "", method: q.metode && METHOD.has(q.metode) ? q.metode : "",
    cashierId: q.kasir && /^[0-9a-f-]{36}$/i.test(q.kasir) ? q.kasir : null, q: (q.cari ?? "").trim().slice(0, 40), page: Math.max(1, Number(q.hal) || 1),
  };
}

const STATE = sql`CASE WHEN o.status = 'cancelled' THEN 'batal'
  WHEN pa.paid > 0 AND pa.paid - rf.refunded <= 0 THEN 'refund'
  WHEN pa.paid >= o.total AND o.total > 0 THEN 'lunas' WHEN pa.paid > 0 THEN 'sebagian' ELSE 'belum' END`;
const FROM_ORDERS = sql`FROM fnb.orders o LEFT JOIN fnb.dining_tables t ON t.id = o.table_id LEFT JOIN core.users u ON u.id = o.opened_by
  CROSS JOIN LATERAL (SELECT coalesce(sum(p.amount), 0)::int AS paid FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL) pa
  CROSS JOIN LATERAL (SELECT coalesce(sum(r.amount), 0)::int AS refunded FROM fnb.refunds r WHERE r.order_id = o.id) rf`;

export async function listTransactions(ctx: FnbContext, f: TxFilter): Promise<{ rows: TxRow[]; total: number; pages: number }> {
  need(ctx);
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    const where = sql`(o.opened_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${f.from}::date AND ${f.to}::date
      AND (${f.cashierId}::uuid IS NULL OR o.opened_by = ${f.cashierId}::uuid)
      AND (${f.method} = '' OR EXISTS (SELECT 1 FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL AND p.method::text = ${f.method}))
      AND (${f.q} = '' OR strpos(lower(o.receipt_no), lower(${f.q})) > 0 OR strpos(lower(coalesce(o.customer_name, '')), lower(${f.q})) > 0)
      AND (${f.state} = '' OR ${STATE} = ${f.state})`;
    const [count] = (await tx.execute(sql`SELECT count(*)::int AS n ${FROM_ORDERS} WHERE ${where}`)) as unknown as { n: number }[];
    const rows = (await tx.execute(sql`
      SELECT o.id, o.receipt_no AS "receiptNo", o.opened_at AS at, coalesce(o.order_type_name, CASE o.type::text WHEN 'dine_in' THEN 'Makan di tempat' WHEN 'takeaway' THEN 'Bungkus' ELSE 'Ambil sendiri' END) AS "typeName",
             t.name AS "tableName", o.customer_name AS "customerName", u.name AS cashier, o.total, pa.paid, rf.refunded, ${STATE} AS state,
             coalesce((SELECT array_agg(DISTINCT p.method::text) FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL), '{}') AS methods
      ${FROM_ORDERS} WHERE ${where} ORDER BY o.opened_at DESC LIMIT ${PAGE} OFFSET ${(f.page - 1) * PAGE}`)) as unknown as (Omit<TxRow, "methods"> & { methods: unknown })[];
    const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : String(v ?? "").replace(/[{}"]/g, "").split(",").filter(Boolean));
    return { rows: rows.map((r) => ({ ...r, methods: arr(r.methods) })), total: count!.n, pages: Math.max(1, Math.ceil(count!.n / PAGE)) };
  });
}

export async function getTransaction(ctx: FnbContext, id: string): Promise<TxDetail> {
  need(ctx);
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    const [o] = (await tx.execute(sql`
      SELECT o.id, o.receipt_no AS "receiptNo", o.opened_at AS at, coalesce(o.order_type_name, CASE o.type::text WHEN 'dine_in' THEN 'Makan di tempat' WHEN 'takeaway' THEN 'Bungkus' ELSE 'Ambil sendiri' END) AS "typeName",
             t.name AS "tableName", o.customer_name AS "customerName", u.name AS cashier, o.total, pa.paid, rf.refunded, ${STATE} AS state,
             o.subtotal, o.discount, o.discount_reason AS "discountReason", o.service_charge AS service, o.tax, o.notes, o.cancel_reason AS "cancelReason",
             o.completed_at AS "completedAt", o.cancelled_at AS "cancelledAt"
      ${FROM_ORDERS} WHERE o.id = ${id}::uuid`)) as unknown as (Omit<TxDetail, "methods" | "lines" | "payments" | "refunds" | "timeline"> & { completedAt: string | null; cancelledAt: string | null })[];
    if (!o) throw notFound("Transaksi");
    const lines = (await tx.execute(sql`
      SELECT l.item_name AS name, l.quantity AS qty, l.unit_price AS "unitPrice", l.notes,
             coalesce((SELECT array_agg(m.name ORDER BY m.name) FROM fnb.order_line_modifiers m WHERE m.order_line_id = l.id), '{}') AS modifiers
      FROM fnb.order_lines l WHERE l.order_id = ${id}::uuid ORDER BY l.created_at`)) as unknown as (TxDetail["lines"][number] & { modifiers: unknown })[];
    const payments = (await tx.execute(sql`
      SELECT p.id, p.method::text AS method, p.amount, p.tendered, p.recorded_at AS at, (p.voided_at IS NOT NULL) AS voided, p.void_reason AS "voidReason", u.name AS by
      FROM fnb.payments p LEFT JOIN core.users u ON u.id = p.recorded_by WHERE p.order_id = ${id}::uuid ORDER BY p.recorded_at`)) as unknown as TxDetail["payments"];
    const refunds = (await tx.execute(sql`
      SELECT r.amount, r.method::text AS method, r.reason, r.refunded_at AS at, u.name AS by FROM fnb.refunds r LEFT JOIN core.users u ON u.id = r.refunded_by WHERE r.order_id = ${id}::uuid ORDER BY r.refunded_at`)) as unknown as TxDetail["refunds"];
    const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : String(v ?? "").replace(/[{}"]/g, "").split(",").filter(Boolean));
    const timeline = [
      { at: o.at, label: `Pesanan dibuat${o.cashier ? ` oleh ${o.cashier}` : ""}` },
      ...payments.map((p) => ({ at: p.at, label: `Pembayaran ${p.method} Rp${p.amount.toLocaleString("id-ID")}${p.voided ? ` (dibatalkan: ${p.voidReason ?? "-"})` : ""}` })),
      ...refunds.map((r) => ({ at: r.at, label: `Refund Rp${r.amount.toLocaleString("id-ID")}: ${r.reason}` })),
      ...(o.completedAt ? [{ at: o.completedAt, label: "Pesanan selesai" }] : []),
      ...(o.cancelledAt ? [{ at: o.cancelledAt, label: `Pesanan dibatalkan: ${o.cancelReason ?? "-"}` }] : []),
    ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    const { completedAt, cancelledAt, ...rest } = o;
    void completedAt; void cancelledAt;
    return { ...rest, methods: [...new Set(payments.filter((p) => !p.voided).map((p) => p.method))], lines: lines.map(({ modifiers, ...l }) => ({ ...l, modifiers: arr(modifiers) })), payments, refunds, timeline };
  });
}
