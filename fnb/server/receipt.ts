import "server-only";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { forbidden, notFound } from "./errors";
import { readSettings } from "./settings";

export interface Receipt {
  businessName: string;
  header: string | null;
  footer: string | null;
  receiptNo: string;
  type: string;
  tableName: string | null;
  customerName: string | null;
  cashier: string | null;
  openedAt: string;
  status: string;
  lines: { name: string; qty: number; unitPrice: number; modifiers: string[]; notes: string | null }[];
  subtotal: number;
  discount: number;
  discountReason: string | null;
  service: number;
  servicePercent: number;
  tax: number;
  taxPercent: number;
  total: number;
  payments: { method: string; amount: number; tendered: number | null; at: string }[];
  refunds: { amount: number; method: string; reason: string }[];
}

/**
 * Struk memakai salinan harga, tarif, dan opsi saat transaksi, bukan data menu hari ini.
 * Mencetak ulang tidak membuat penjualan baru.
 */
export async function getReceipt(ctx: FnbContext, orderId: string): Promise<Receipt> {
  if (!can(ctx, "orders.sell") && !can(ctx, "cash.manage") && !can(ctx, "reports.read")) throw forbidden();
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    const [o] = (await tx.execute(sql`
      SELECT o.receipt_no AS "receiptNo", o.type::text AS type, t.name AS "tableName", o.customer_name AS "customerName", u.name AS cashier,
             o.opened_at AS "openedAt", o.status::text AS status, o.subtotal, o.discount, o.discount_reason AS "discountReason",
             o.service_charge AS service, o.service_percent::float8 AS "servicePercent", o.tax, o.tax_percent::float8 AS "taxPercent", o.total
      FROM fnb.orders o LEFT JOIN fnb.dining_tables t ON t.id = o.table_id LEFT JOIN core.users u ON u.id = o.opened_by
      WHERE o.id = ${orderId}::uuid`)) as unknown as Omit<Receipt, "businessName" | "header" | "footer" | "lines" | "payments" | "refunds">[];
    if (!o) throw notFound("Pesanan");
    const lines = (await tx.execute(sql`
      SELECT l.id, l.item_name AS name, l.quantity AS qty, l.unit_price AS "unitPrice", l.notes,
             coalesce((SELECT array_agg(m.name ORDER BY m.name) FROM fnb.order_line_modifiers m WHERE m.order_line_id = l.id), '{}') AS modifiers
      FROM fnb.order_lines l WHERE l.order_id = ${orderId}::uuid ORDER BY l.created_at`)) as unknown as (Receipt["lines"][number] & { modifiers: unknown })[];
    const payments = (await tx.execute(sql`
      SELECT method::text AS method, amount, tendered, recorded_at AS at FROM fnb.payments WHERE order_id = ${orderId}::uuid AND voided_at IS NULL ORDER BY recorded_at`)) as unknown as Receipt["payments"];
    const refunds = (await tx.execute(sql`SELECT amount, method::text AS method, reason FROM fnb.refunds WHERE order_id = ${orderId}::uuid ORDER BY refunded_at`)) as unknown as Receipt["refunds"];
    const settings = await readSettings(tx, ctx.businessId);
    const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : String(v ?? "").replace(/[{}"]/g, "").split(",").filter(Boolean));
    return { ...o, businessName: settings.businessName, header: settings.receiptHeader, footer: settings.receiptFooter, lines: lines.map(({ modifiers, ...l }) => ({ ...l, modifiers: arr(modifiers) })), payments, refunds };
  });
}
