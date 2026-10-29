import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { OrderInput, OrderStatusInput } from "@/lib/schemas";
import { db } from "./db";
import { can, type FnbContext } from "./context";
import { deductOrderStock, restoreOrderStock } from "./stock";

export const ORDER_STATUSES = ["open", "confirmed", "preparing", "ready", "served", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderLine = {
  id: string; itemId: string; name: string; price: number; qty: number;
  notes: string | null; stationId: string | null; stationName: string | null; status: string;
};
export type Order = {
  id: string; number: string; type: string; status: string; tableName: string | null;
  customerName: string | null; total: number; paid: number; notes: string | null; openedAt: string; lines: OrderLine[];
};

const canSell = (ctx: FnbContext) => can(ctx, "orders.sell");
const canKitchen = (ctx: FnbContext) => can(ctx, "kitchen.run");
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

const ORDER_SELECT = sql`
  SELECT o.id, o.order_number::text AS number, o.type, o.status, t.name AS "tableName",
         o.customer_name AS "customerName", o.total, o.notes, o.opened_at AS "openedAt",
         (SELECT coalesce(sum(p.amount), 0)::int FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL) AS paid
  FROM fnb.orders o LEFT JOIN fnb.dining_tables t ON t.id = o.table_id
`;

export function listOrders(ctx: FnbContext, scope: "active" | "all" = "active"): Promise<Order[]> {
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(
      scope === "active"
        ? sql`${ORDER_SELECT} WHERE o.status IN ('confirmed','preparing','ready','served') ORDER BY o.opened_at`
        : sql`${ORDER_SELECT} ORDER BY o.opened_at DESC LIMIT 100`,
    )) as unknown as Omit<Order, "lines">[];
    if (!rows.length) return [];
    const lines = (await tx.execute(sql`
      SELECT l.id, l.order_id AS "orderId", l.menu_item_id AS "itemId", l.item_name AS name, l.unit_price AS price,
             l.quantity AS qty, l.notes, l.station_id AS "stationId", s.name AS "stationName", l.status
      FROM fnb.order_lines l LEFT JOIN fnb.kitchen_stations s ON s.id = l.station_id
      WHERE l.order_id IN (${sql.join(rows.map((r) => sql`${r.id}::uuid`), sql`, `)})
      ORDER BY l.created_at
    `)) as unknown as (OrderLine & { orderId: string })[];
    return rows.map((o) => ({ ...o, lines: lines.filter((l) => l.orderId === o.id).map(({ orderId, ...l }) => l) }));
  });
}

/** Total dihitung server dari harga menu, bukan dari angka yang dikirim layar. */
export async function createOrder(ctx: FnbContext, input: z.infer<typeof OrderInput>) {
  if (!canSell(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const items = (await tx.execute(sql`
      SELECT id, name, price, station_id AS "stationId", is_available AS available
      FROM fnb.menu_items WHERE id IN (${sql.join(input.lines.map((l) => sql`${l.menuItemId}::uuid`), sql`, `)}) AND archived_at IS NULL
    `)) as unknown as { id: string; name: string; price: number; stationId: string | null; available: boolean }[];
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const line of input.lines) {
      const item = byId.get(line.menuItemId);
      if (!item) throw new Error("NOT_FOUND");
      if (!item.available) throw new Error("ITEM_UNAVAILABLE");
    }
    const outlet = (await tx.execute(sql`SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    if (!outlet[0]) throw new Error("NO_OUTLET");
    const subtotal = input.lines.reduce((sum, l) => sum + byId.get(l.menuItemId)!.price * l.quantity, 0);
    const tableId = input.tableId ?? null;
    const [order] = (await tx.execute(sql`
      INSERT INTO fnb.orders (business_id, outlet_id, table_id, type, status, customer_name, subtotal, total, notes, opened_by)
      VALUES (${ctx.businessId}::uuid, ${outlet[0].id}::uuid, ${tableId}::uuid, ${input.type}::fnb.order_type, 'confirmed',
              ${input.customerName ?? null}, ${subtotal}, ${subtotal}, ${input.notes ?? null}, ${ctx.userId}::uuid)
      RETURNING id
    `)) as unknown as { id: string }[];
    for (const line of input.lines) {
      const item = byId.get(line.menuItemId)!;
      await tx.execute(sql`
        INSERT INTO fnb.order_lines (business_id, order_id, menu_item_id, station_id, item_name, unit_price, quantity, notes, status)
        VALUES (${ctx.businessId}::uuid, ${order!.id}::uuid, ${item.id}::uuid, ${item.stationId}::uuid, ${item.name}, ${item.price},
                ${line.quantity}, ${line.notes ?? null}, 'confirmed')
      `);
    }
    await deductOrderStock(tx, ctx, order!.id, input.lines);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order.created",
      targetType: "order", targetId: order!.id, meta: { total: subtotal, lines: input.lines.length },
    });
    return { id: order!.id };
  });
}

const NEXT: Record<string, OrderStatus[]> = {
  open: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["ready", "cancelled"],
  ready: ["served"], served: ["completed"], completed: [], cancelled: [],
};

export async function updateOrderStatus(ctx: FnbContext, id: string, status: OrderStatus) {
  if (!canSell(ctx) && !canKitchen(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`SELECT status FROM fnb.orders WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { status: string }[];
    const current = rows[0]?.status;
    if (!current) throw new Error("NOT_FOUND");
    if (!NEXT[current]?.includes(status)) throw new Error("INVALID_TRANSITION");
    await tx.execute(sql`
      UPDATE fnb.orders SET status = ${status}::fnb.order_status,
        completed_at = CASE WHEN ${status} = 'completed' THEN now() ELSE completed_at END,
        cancelled_at = CASE WHEN ${status} = 'cancelled' THEN now() ELSE cancelled_at END
      WHERE id = ${id}::uuid
    `);
    if (status === "cancelled") await restoreOrderStock(tx, ctx, id);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order.status_changed",
      targetType: "order", targetId: id, meta: { from: current, to: status },
    });
  });
}

/** Dapur menandai satu item siap; status pesanan ikut menyesuaikan. */
export async function updateLineStatus(ctx: FnbContext, lineId: string, status: "preparing" | "ready") {
  if (!canKitchen(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE fnb.order_lines SET status = ${status}::fnb.order_status
      WHERE id = ${lineId}::uuid RETURNING order_id AS "orderId"
    `)) as unknown as { orderId: string }[];
    const orderId = rows[0]?.orderId;
    if (!orderId) throw new Error("NOT_FOUND");
    const summary = (await tx.execute(sql`
      SELECT count(*) FILTER (WHERE status = 'ready') AS ready, count(*) AS total, min(status::text) AS first
      FROM fnb.order_lines WHERE order_id = ${orderId}::uuid
    `)) as unknown as { ready: string; total: string; first: string }[];
    const { ready, total } = summary[0]!;
    const orderStatus = Number(ready) === Number(total) ? "ready" : "preparing";
    await tx.execute(sql`
      UPDATE fnb.orders SET status = ${orderStatus}::fnb.order_status WHERE id = ${orderId}::uuid AND status IN ('confirmed','preparing')
    `);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order_line.status_changed",
      targetType: "order_line", targetId: lineId, meta: { status, orderId, orderStatus },
    });
  });
}
