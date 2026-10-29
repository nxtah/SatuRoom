import "server-only";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden } from "./errors";
import { REPORT_DATE } from "./reports";

/** Sel yang diawali = + - @ diberi tanda kutip agar tidak dijalankan sebagai rumus di Excel/Sheets. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** Penjualan per pesanan untuk rentang tanggal (zona Jakarta), maksimal 366 hari. */
export async function salesCsv(ctx: FnbContext, from: string, to: string): Promise<string> {
  if (!can(ctx, "reports.read")) throw forbidden();
  if (!REPORT_DATE.test(from) || !REPORT_DATE.test(to) || from > to) throw new AppError(422, "invalid_date", "Rentang tanggal tidak valid.");
  if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 366) throw new AppError(422, "range_too_long", "Rentang maksimal 366 hari.");
  const rows = await withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => (await tx.execute(sql`
    SELECT o.receipt_no AS "no", to_char(o.opened_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS "tanggal", o.type::text AS "jenis",
           t.name AS "meja", o.status::text AS "status", o.subtotal, o.discount, o.service_charge AS service, o.tax, o.total,
           (SELECT coalesce(sum(p.amount), 0) FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL)::int AS "dibayar",
           (SELECT coalesce(sum(r.amount), 0) FROM fnb.refunds r WHERE r.order_id = o.id)::int AS "refund",
           o.cancel_reason AS "alasanBatal"
    FROM fnb.orders o LEFT JOIN fnb.dining_tables t ON t.id = o.table_id
    WHERE (o.opened_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${from}::date AND ${to}::date
    ORDER BY o.opened_at LIMIT 20000`)) as unknown as Record<string, unknown>[]);
  const head = ["No. struk", "Tanggal", "Jenis", "Meja", "Status", "Subtotal", "Diskon", "Service", "Pajak", "Total", "Dibayar", "Refund", "Alasan batal"];
  const keys = ["no", "tanggal", "jenis", "meja", "status", "subtotal", "discount", "service", "tax", "total", "dibayar", "refund", "alasanBatal"];
  return `﻿${[head.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\r\n")}\r\n`;
}
