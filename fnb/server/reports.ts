import "server-only";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { can, type FnbContext } from "./context";

export type DailyReport = {
  date: string;
  sales: number;
  paymentCount: number;
  byMethod: { method: string; amount: number }[];
  orders: { total: number; cancelled: number; voidedPayments: number; voidedAmount: number };
  topItems: { name: string; quantity: number; revenue: number }[];
  /** Refund pada hari itu; sudah dikurangkan dari `sales` dan `byMethod`. */
  refunds: { count: number; amount: number };
  /** Diskon, service charge, dan pajak dari pesanan yang tidak dibatalkan hari itu. */
  charges: { discount: number; service: number; tax: number };
  /** Pengeluaran operasional yang tidak dibatalkan pada tanggal itu. */
  expenses: number;
  foodCost: number;
  lowStock: { name: string; unit: string; stock: number; minimum: number }[];
};

const canView = (ctx: FnbContext) => can(ctx, "reports.read");
export const REPORT_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Tanggal hari ini menurut waktu Jakarta, format YYYY-MM-DD. */
export const todayJakarta = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

/** Laporan satu hari kalender (WIB): penjualan, metode bayar, menu terlaris, food cost, stok tipis. */
export async function dailyReport(ctx: FnbContext, date: string): Promise<DailyReport> {
  if (!canView(ctx)) throw new Error("FORBIDDEN");
  if (!REPORT_DATE.test(date)) throw new Error("INVALID_DATE");
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    const day = (col: ReturnType<typeof sql.raw>) => sql`(${col} AT TIME ZONE 'Asia/Jakarta')::date = ${date}::date`;
    const methods = (await tx.execute(sql`
      SELECT method::text AS method, SUM(amount)::int AS amount, COUNT(*)::int AS count
      FROM fnb.payments WHERE voided_at IS NULL AND ${day(sql.raw("recorded_at"))} GROUP BY method ORDER BY amount DESC
    `)) as unknown as { method: string; amount: number; count: number }[];
    const refundRows = (await tx.execute(sql`
      SELECT method::text AS method, SUM(amount)::int AS amount, COUNT(*)::int AS count
      FROM fnb.refunds WHERE ${day(sql.raw("refunded_at"))} GROUP BY method
    `)) as unknown as { method: string; amount: number; count: number }[];
    const [charges] = (await tx.execute(sql`
      SELECT COALESCE(SUM(discount), 0)::int AS discount, COALESCE(SUM(service_charge), 0)::int AS service, COALESCE(SUM(tax), 0)::int AS tax
      FROM fnb.orders WHERE status <> 'cancelled' AND ${day(sql.raw("opened_at"))}
    `)) as unknown as { discount: number; service: number; tax: number }[];
    const [expense] = (await tx.execute(sql`
      SELECT COALESCE(SUM(amount), 0)::int AS total FROM fnb.expenses WHERE voided_at IS NULL AND spent_on = ${date}::date
    `)) as unknown as { total: number }[];
    const [orders] = (await tx.execute(sql`
      SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM fnb.orders WHERE ${day(sql.raw("opened_at"))}
    `)) as unknown as { total: number; cancelled: number }[];
    const [voided] = (await tx.execute(sql`
      SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::int AS amount
      FROM fnb.payments WHERE voided_at IS NOT NULL AND ${day(sql.raw("recorded_at"))}
    `)) as unknown as { count: number; amount: number }[];
    const topItems = (await tx.execute(sql`
      SELECT l.item_name AS name, SUM(l.quantity)::int AS quantity, SUM(l.quantity * l.unit_price)::int AS revenue
      FROM fnb.order_lines l JOIN fnb.orders o ON o.id = l.order_id
      WHERE o.status <> 'cancelled' AND ${day(sql.raw("o.opened_at"))}
      GROUP BY l.item_name ORDER BY quantity DESC, revenue DESC LIMIT 5
    `)) as unknown as DailyReport["topItems"];
    const [cost] = (await tx.execute(sql`
      SELECT COALESCE(ROUND(SUM(-m.quantity * i.average_cost)), 0)::int AS cost
      FROM fnb.stock_movements m JOIN fnb.ingredients i ON i.id = m.ingredient_id
      WHERE m.reference_type IN ('order', 'order_cancel') AND ${day(sql.raw("m.created_at"))}
    `)) as unknown as { cost: number }[];
    const lowStock = (await tx.execute(sql`
      SELECT name, unit, stock::float8 AS stock, minimum_stock::float8 AS minimum
      FROM fnb.ingredients WHERE archived_at IS NULL AND stock <= minimum_stock ORDER BY name
    `)) as unknown as DailyReport["lowStock"];
    const net = methods.map(({ method, amount }) => ({ method, amount: amount - (refundRows.find((r) => r.method === method)?.amount ?? 0) }));
    for (const r of refundRows) if (!net.some((m) => m.method === r.method)) net.push({ method: r.method, amount: -r.amount });
    return {
      date,
      sales: net.reduce((a, m) => a + m.amount, 0),
      paymentCount: methods.reduce((a, m) => a + m.count, 0),
      byMethod: net.sort((a, b) => b.amount - a.amount),
      refunds: { count: refundRows.reduce((a, r) => a + r.count, 0), amount: refundRows.reduce((a, r) => a + r.amount, 0) },
      expenses: expense?.total ?? 0,
      charges: charges ?? { discount: 0, service: 0, tax: 0 },
      orders: { total: orders?.total ?? 0, cancelled: orders?.cancelled ?? 0, voidedPayments: voided?.count ?? 0, voidedAmount: voided?.amount ?? 0 },
      topItems,
      foodCost: cost?.cost ?? 0,
      lowStock,
    };
  });
}

export type SalesSeries = {
  /** 7 hari berakhir di `today`, lama ke baru. */
  days: { date: string; sales: number }[];
  /** Pesanan per jam buka (WIB) selama 7 hari itu; hanya jam yang ada pesanannya. */
  hours: { hour: number; orders: number }[];
};

/** Tren penjualan 7 hari dan jam ramai, untuk grafik di Ringkasan. */
export async function salesSeries(ctx: FnbContext, today: string): Promise<SalesSeries> {
  if (!canView(ctx)) throw new Error("FORBIDDEN");
  if (!REPORT_DATE.test(today)) throw new Error("INVALID_DATE");
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    const days = (await tx.execute(sql`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS date,
             (COALESCE((SELECT SUM(p.amount) FROM fnb.payments p WHERE p.voided_at IS NULL AND (p.recorded_at AT TIME ZONE 'Asia/Jakarta')::date = d::date), 0)
            - COALESCE((SELECT SUM(r.amount) FROM fnb.refunds r WHERE (r.refunded_at AT TIME ZONE 'Asia/Jakarta')::date = d::date), 0))::int AS sales
      FROM generate_series(${today}::date - 6, ${today}::date, interval '1 day') d
      ORDER BY d
    `)) as unknown as SalesSeries["days"];
    const hours = (await tx.execute(sql`
      SELECT EXTRACT(HOUR FROM opened_at AT TIME ZONE 'Asia/Jakarta')::int AS hour, COUNT(*)::int AS orders
      FROM fnb.orders
      WHERE status <> 'cancelled' AND (opened_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${today}::date - 6 AND ${today}::date
      GROUP BY 1 ORDER BY 1
    `)) as unknown as SalesSeries["hours"];
    return { days, hours };
  });
}
