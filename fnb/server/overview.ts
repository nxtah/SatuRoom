import "server-only";
import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { forbidden } from "./errors";
import { REPORT_DATE } from "./reports";

export type Overview = {
  salesToday: number; salesYesterday: number; salesLastWeek: number; salesMonth: number;
  orders: number; avgTicket: number; grossProfit: number; margin: number;
  byType: { name: string; orders: number; total: number }[];
  shift: { openedAt: string; cashier: string | null; openingCash: number } | null;
  slowItems: { name: string; quantity: number }[];
};

/** Perbandingan dan angka tambahan untuk Beranda. Penjualan = pembayaran masuk dikurangi refund, sama seperti laporan harian. */
export async function overview(ctx: FnbContext, today: string): Promise<Overview> {
  if (!can(ctx, "reports.read")) throw forbidden();
  if (!REPORT_DATE.test(today)) throw new Error("INVALID_DATE");
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    const net = (d: ReturnType<typeof sql>) => sql`(COALESCE((SELECT SUM(p.amount) FROM fnb.payments p WHERE p.voided_at IS NULL AND (p.recorded_at AT TIME ZONE 'Asia/Jakarta')::date ${d}), 0)
      - COALESCE((SELECT SUM(r.amount) FROM fnb.refunds r WHERE (r.refunded_at AT TIME ZONE 'Asia/Jakarta')::date ${d}), 0))::int`;
    const [s] = (await tx.execute(sql`SELECT ${net(sql`= ${today}::date`)} AS "salesToday", ${net(sql`= ${today}::date - 1`)} AS "salesYesterday", ${net(sql`= ${today}::date - 7`)} AS "salesLastWeek",
      ${net(sql`BETWEEN date_trunc('month', ${today}::date)::date AND ${today}::date`)} AS "salesMonth"`)) as unknown as Pick<Overview, "salesToday" | "salesYesterday" | "salesLastWeek" | "salesMonth">[];
    const [o] = (await tx.execute(sql`SELECT count(*)::int AS orders, coalesce(sum(total), 0)::int AS total FROM fnb.orders o WHERE status <> 'cancelled' AND (opened_at AT TIME ZONE 'Asia/Jakarta')::date = ${today}::date`)) as unknown as { orders: number; total: number }[];
    const [g] = (await tx.execute(sql`
      SELECT coalesce(sum(l.unit_price * l.quantity - CASE WHEN o.subtotal > 0 THEN o.discount::numeric * l.unit_price * l.quantity / o.subtotal ELSE 0 END - l.unit_cost * l.quantity), 0)::int AS profit,
             coalesce(sum(l.unit_price * l.quantity - CASE WHEN o.subtotal > 0 THEN o.discount::numeric * l.unit_price * l.quantity / o.subtotal ELSE 0 END), 0)::int AS net
      FROM fnb.order_lines l JOIN fnb.orders o ON o.id = l.order_id WHERE o.status <> 'cancelled' AND (o.opened_at AT TIME ZONE 'Asia/Jakarta')::date = ${today}::date`)) as unknown as { profit: number; net: number }[];
    const byType = (await tx.execute(sql`
      SELECT coalesce(o.order_type_name, CASE o.type::text WHEN 'dine_in' THEN 'Makan di tempat' WHEN 'takeaway' THEN 'Bungkus' ELSE 'Ambil sendiri' END) AS name, count(*)::int AS orders, sum(o.total)::int AS total
      FROM fnb.orders o WHERE o.status <> 'cancelled' AND (o.opened_at AT TIME ZONE 'Asia/Jakarta')::date = ${today}::date GROUP BY 1 ORDER BY sum(o.total) DESC`)) as unknown as Overview["byType"];
    const [shift] = (await tx.execute(sql`SELECT s.opened_at AS "openedAt", u.name AS cashier, s.opening_cash AS "openingCash" FROM fnb.cash_shifts s LEFT JOIN core.users u ON u.id = s.opened_by WHERE s.closed_at IS NULL ORDER BY s.opened_at DESC LIMIT 1`)) as unknown as Overview["shift"][];
    const slowItems = (await tx.execute(sql`
      SELECT i.name, coalesce(sum(l.quantity) FILTER (WHERE o.status <> 'cancelled' AND (o.opened_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN ${today}::date - 29 AND ${today}::date), 0)::int AS quantity
      FROM fnb.menu_items i LEFT JOIN fnb.order_lines l ON l.menu_item_id = i.id LEFT JOIN fnb.orders o ON o.id = l.order_id
      WHERE i.archived_at IS NULL AND i.created_at < (${today}::date - 14) GROUP BY i.id ORDER BY 2, i.name LIMIT 5`)) as unknown as Overview["slowItems"];
    return { ...s!, orders: o!.orders, avgTicket: o!.orders ? Math.round(o!.total / o!.orders) : 0, grossProfit: g!.profit, margin: g!.net ? Math.round((g!.profit / g!.net) * 1000) / 10 : 0, byType, shift: shift ?? null, slowItems };
  });
}
