import "server-only";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { db } from "./db";
import type { FnbContext } from "./context";

export type DailyReport = {
  date: string;
  sales: number;
  paymentCount: number;
  byMethod: { method: string; amount: number }[];
  orders: { total: number; cancelled: number; voidedPayments: number; voidedAmount: number };
  topItems: { name: string; quantity: number; revenue: number }[];
  foodCost: number;
  lowStock: { name: string; unit: string; stock: number; minimum: number }[];
};

const canView = (ctx: FnbContext) => ctx.roles.some((r) => ["owner", "manager", "accounting"].includes(r));
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
    return {
      date,
      sales: methods.reduce((a, m) => a + m.amount, 0),
      paymentCount: methods.reduce((a, m) => a + m.count, 0),
      byMethod: methods.map(({ method, amount }) => ({ method, amount })),
      orders: { total: orders?.total ?? 0, cancelled: orders?.cancelled ?? 0, voidedPayments: voided?.count ?? 0, voidedAmount: voided?.amount ?? 0 },
      topItems,
      foodCost: cost?.cost ?? 0,
      lowStock,
    };
  });
}
