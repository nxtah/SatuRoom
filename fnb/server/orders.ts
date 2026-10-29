import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { OrderInput, OrderStatusInput } from "@/lib/schemas";
import { db } from "./db";
import { can, type FnbContext } from "./context";
import { computeTotals } from "@/lib/pricing";
import { AppError, forbidden } from "./errors";
import { resolveModifiers } from "./modifiers";
import { readSettings } from "./settings";
import { deductOrderStock, restoreOrderStock } from "./stock";

export const ORDER_STATUSES = ["open", "confirmed", "preparing", "ready", "served", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderLine = {
  id: string; itemId: string; name: string; price: number; qty: number;
  notes: string | null; stationId: string | null; stationName: string | null; status: string;
  modifiers: { name: string; priceDelta: number }[];
};
export type Order = {
  id: string; number: string; type: string; status: string; tableName: string | null;
  customerName: string | null; total: number; paid: number; notes: string | null; openedAt: string; lines: OrderLine[];
  receiptNo: string; subtotal: number; discount: number; serviceCharge: number; tax: number; refunded: number; cancelReason: string | null;
};

const canSell = (ctx: FnbContext) => can(ctx, "orders.sell");
const canKitchen = (ctx: FnbContext) => can(ctx, "kitchen.run");
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

const ORDER_SELECT = sql`
  SELECT o.id, o.order_number::text AS number, o.type, o.status, t.name AS "tableName",
         o.customer_name AS "customerName", o.total, o.notes, o.opened_at AS "openedAt", o.receipt_no AS "receiptNo",
         o.subtotal, o.discount, o.service_charge AS "serviceCharge", o.tax, o.cancel_reason AS "cancelReason",
         (SELECT coalesce(sum(p.amount), 0)::int FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL) AS paid,
         (SELECT coalesce(sum(r.amount), 0)::int FROM fnb.refunds r WHERE r.order_id = o.id) AS refunded
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
    `)) as unknown as (Omit<OrderLine, "modifiers"> & { orderId: string })[];
    const mods = (await tx.execute(sql`
      SELECT order_line_id AS "lineId", name, price_delta AS "priceDelta" FROM fnb.order_line_modifiers
      WHERE order_line_id IN (${sql.join(lines.map((l) => sql`${l.id}::uuid`), sql`, `)}) ORDER BY name
    `)) as unknown as { lineId: string; name: string; priceDelta: number }[];
    return rows.map((o) => ({
      ...o,
      lines: lines.filter((l) => l.orderId === o.id).map(({ orderId, ...l }) => ({ ...l, modifiers: mods.filter((m) => m.lineId === l.id).map(({ name, priceDelta }) => ({ name, priceDelta })) })),
    }));
  });
}

/** Total dihitung server dari harga menu, bukan dari angka yang dikirim layar. */
export async function createOrder(ctx: FnbContext, input: z.input<typeof OrderInput>): Promise<{ id: string; receiptNo: string; total: number }> {
  if (!canSell(ctx)) throw new Error("FORBIDDEN");
  const wantsDiscount = (input.discountValue ?? 0) > 0;
  if (wantsDiscount) {
    if (!can(ctx, "orders.discount")) throw forbidden();
    if (!input.discountType) throw new AppError(422, "discount_invalid", "Pilih jenis diskon.");
    if (!input.discountReason || input.discountReason.length < 3) throw new AppError(422, "discount_reason", "Alasan diskon wajib diisi.");
    if (input.discountType === "percent" && (input.discountValue ?? 0) > 100) throw new AppError(422, "discount_invalid", "Diskon maksimal 100%.");
  }
  const existing = () => inBusiness(ctx, async (tx) => {
    if (!input.idempotencyKey) return null;
    const [row] = (await tx.execute(sql`SELECT id, receipt_no AS "receiptNo", total FROM fnb.orders WHERE idempotency_key = ${input.idempotencyKey}`)) as unknown as { id: string; receiptNo: string; total: number }[];
    return row ?? null;
  });
  // Klik ganda atau kirim ulang dengan kunci yang sama mengembalikan pesanan yang sama, bukan pesanan baru.
  const again = await existing();
  if (again) return again;
  try {
    return await insertOrder(ctx, input, wantsDiscount);
  } catch (error) {
    const raced = input.idempotencyKey && (error as { code?: string; cause?: { code?: string } }).cause?.code === "23505" ? await existing() : null;
    if (raced) return raced;
    throw error;
  }
}

function insertOrder(ctx: FnbContext, input: z.input<typeof OrderInput>, wantsDiscount: boolean) {
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
    const priced = [];
    for (const line of input.lines) {
      const mods = await resolveModifiers(tx, line.menuItemId, line.modifierIds ?? []);
      priced.push({ line, mods, unitPrice: byId.get(line.menuItemId)!.price + mods.delta });
    }
    const subtotal = priced.reduce((sum, p) => sum + p.unitPrice * p.line.quantity, 0);
    const settings = await readSettings(tx, ctx.businessId);
    const totals = computeTotals({
      gross: subtotal,
      discountType: wantsDiscount ? input.discountType : null,
      discountValue: wantsDiscount ? input.discountValue : 0,
      servicePercent: settings.servicePercent,
      taxPercent: settings.taxPercent,
    });
    const receiptNo = await nextReceiptNo(tx, ctx.businessId, settings.receiptPrefix);
    const tableId = input.type === "dine_in" ? input.tableId ?? null : null;
    if (tableId) {
      const [busy] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.orders WHERE table_id = ${tableId}::uuid AND status IN ('confirmed','preparing','ready','served') LIMIT 1`)) as unknown as { x: number }[];
      if (busy) throw new AppError(409, "table_busy", "Meja sedang dipakai pesanan lain. Pilih meja lain atau gabungkan pesanannya.");
    }
    const [order] = (await tx.execute(sql`
      INSERT INTO fnb.orders (business_id, outlet_id, table_id, type, status, customer_name, subtotal, discount, discount_reason, service_charge, tax,
                              service_percent, tax_percent, total, notes, opened_by, receipt_no, idempotency_key)
      VALUES (${ctx.businessId}::uuid, ${outlet[0].id}::uuid, ${tableId}::uuid, ${input.type}::fnb.order_type, 'confirmed',
              ${input.customerName ?? null}, ${subtotal}, ${totals.discount}, ${wantsDiscount ? input.discountReason ?? null : null}, ${totals.service}, ${totals.tax},
              ${settings.servicePercent}, ${settings.taxPercent}, ${totals.total}, ${input.notes ?? null}, ${ctx.userId}::uuid, ${receiptNo}, ${input.idempotencyKey ?? null})
      RETURNING id
    `)) as unknown as { id: string }[];
    for (const { line, mods, unitPrice } of priced) {
      const item = byId.get(line.menuItemId)!;
      const [created] = (await tx.execute(sql`
        INSERT INTO fnb.order_lines (business_id, order_id, menu_item_id, station_id, item_name, unit_price, quantity, notes, status)
        VALUES (${ctx.businessId}::uuid, ${order!.id}::uuid, ${item.id}::uuid, ${item.stationId}::uuid, ${item.name}, ${unitPrice},
                ${line.quantity}, ${line.notes ?? null}, 'confirmed')
        RETURNING id
      `)) as unknown as { id: string }[];
      for (const m of mods.rows) {
        await tx.execute(sql`
          INSERT INTO fnb.order_line_modifiers (business_id, order_line_id, modifier_id, name, price_delta)
          VALUES (${ctx.businessId}::uuid, ${created!.id}::uuid, ${m.id}::uuid, ${m.name}, ${m.priceDelta})
        `);
      }
    }
    await deductOrderStock(tx, ctx, order!.id, input.lines);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order.created",
      targetType: "order", targetId: order!.id, meta: { receiptNo, subtotal, discount: totals.discount, total: totals.total, lines: input.lines.length },
    });
    return { id: order!.id, receiptNo, total: totals.total };
  });
}

type Tx = Parameters<Parameters<typeof withContext>[2]>[0];

/** Nomor struk berurutan per bisnis per hari (zona Jakarta), mis. INV-261030-0001. */
export async function nextReceiptNo(tx: Tx, businessId: string, prefix: string) {
  const ymd = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }).replaceAll("-", "").slice(2);
  const [counter] = (await tx.execute(sql`
    INSERT INTO fnb.counters (business_id, key, value) VALUES (${businessId}::uuid, ${`receipt:${ymd}`}, 1)
    ON CONFLICT (business_id, key) DO UPDATE SET value = fnb.counters.value + 1 RETURNING value`)) as unknown as { value: string }[];
  return `${prefix}-${ymd}-${String(counter!.value).padStart(4, "0")}`;
}

/** Hitung ulang total pesanan dari baris yang tersisa, memakai tarif yang tersimpan di pesanan itu. */
export async function repriceOrder(tx: Tx, orderId: string) {
  const [o] = (await tx.execute(sql`
    SELECT o.service_percent::float8 AS "servicePercent", o.tax_percent::float8 AS "taxPercent",
           coalesce((SELECT sum(l.unit_price * l.quantity) FROM fnb.order_lines l WHERE l.order_id = o.id), 0)::int AS subtotal
    FROM fnb.orders o WHERE o.id = ${orderId}::uuid`)) as unknown as { servicePercent: number; taxPercent: number; subtotal: number }[];
  const t = computeTotals({ gross: o!.subtotal, servicePercent: o!.servicePercent, taxPercent: o!.taxPercent });
  await tx.execute(sql`UPDATE fnb.orders SET subtotal = ${t.gross}, discount = 0, service_charge = ${t.service}, tax = ${t.tax}, total = ${t.total} WHERE id = ${orderId}::uuid`);
  return t.total;
}

const NEXT: Record<string, OrderStatus[]> = {
  open: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["ready", "cancelled"],
  ready: ["served"], served: ["completed"], completed: [], cancelled: [],
};

export async function updateOrderStatus(ctx: FnbContext, id: string, status: OrderStatus, reason?: string) {
  if (!canSell(ctx) && !canKitchen(ctx)) throw new Error("FORBIDDEN");
  if (status === "cancelled" && (reason?.trim().length ?? 0) < 3) throw new AppError(422, "reason_required", "Alasan pembatalan wajib diisi.");
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`SELECT status FROM fnb.orders WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { status: string }[];
    const current = rows[0]?.status;
    if (!current) throw new Error("NOT_FOUND");
    if (!NEXT[current]?.includes(status)) throw new Error("INVALID_TRANSITION");
    if (status === "cancelled") {
      const [paid] = (await tx.execute(sql`SELECT count(*)::int AS n FROM fnb.payments WHERE order_id = ${id}::uuid AND voided_at IS NULL`)) as unknown as { n: number }[];
      if (paid!.n) throw new AppError(409, "has_payments", "Pesanan sudah dibayar. Batalkan atau refund pembayarannya dulu.");
    }
    await tx.execute(sql`
      UPDATE fnb.orders SET status = ${status}::fnb.order_status,
        completed_at = CASE WHEN ${status} = 'completed' THEN now() ELSE completed_at END,
        cancelled_at = CASE WHEN ${status} = 'cancelled' THEN now() ELSE cancelled_at END,
        cancel_reason = CASE WHEN ${status} = 'cancelled' THEN ${reason?.trim() ?? null} ELSE cancel_reason END
      WHERE id = ${id}::uuid
    `);
    if (status === "cancelled") await restoreOrderStock(tx, ctx, id);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order.status_changed",
      targetType: "order", targetId: id, meta: { from: current, to: status, ...(reason ? { reason } : {}) },
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
