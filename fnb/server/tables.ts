import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { TableInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { nextReceiptNo, repriceOrder } from "./orders";
import { readSettings } from "./settings";

export type DiningTable = {
  id: string; name: string; capacity: number | null;
  order: { id: string; receiptNo: string; status: string; total: number } | null;
};

const ACTIVE = sql`('confirmed','preparing','ready','served')`;
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const needSell = (ctx: FnbContext) => { if (!can(ctx, "orders.sell")) throw forbidden(); };
const needSettings = (ctx: FnbContext) => { if (!can(ctx, "settings.manage")) throw forbidden(); };

export function listTables(ctx: FnbContext): Promise<DiningTable[]> {
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT t.id, t.name, t.capacity, o.id AS "orderId", o.receipt_no AS "receiptNo", o.status::text AS status, o.total
      FROM fnb.dining_tables t
      LEFT JOIN fnb.orders o ON o.table_id = t.id AND o.status IN ${ACTIVE}
      WHERE t.archived_at IS NULL ORDER BY t.name`)) as unknown as (Omit<DiningTable, "order"> & { orderId: string | null; receiptNo: string; status: string; total: number })[];
    return rows.map((r) => ({ id: r.id, name: r.name, capacity: r.capacity, order: r.orderId ? { id: r.orderId, receiptNo: r.receiptNo, status: r.status, total: r.total } : null }));
  });
}

export async function createTable(ctx: FnbContext, input: z.infer<typeof TableInput>) {
  needSettings(ctx);
  return inBusiness(ctx, async (tx) => {
    const [outlet] = (await tx.execute(sql`SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    if (!outlet) throw new AppError(409, "no_outlet", "Cabang belum ada.");
    const [dup] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.dining_tables WHERE archived_at IS NULL AND lower(name) = lower(${input.name})`)) as unknown as unknown[];
    if (dup) throw new AppError(409, "table_exists", "Nama meja sudah dipakai.");
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.dining_tables (business_id, outlet_id, name, capacity) VALUES (${ctx.businessId}::uuid, ${outlet.id}::uuid, ${input.name}, ${input.capacity ?? null}) RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.table.created", targetType: "table", targetId: row!.id, meta: { name: input.name } });
    return { id: row!.id };
  });
}

export async function updateTable(ctx: FnbContext, id: string, input: z.infer<typeof TableInput>) {
  needSettings(ctx);
  return inBusiness(ctx, async (tx) => {
    const [dup] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.dining_tables WHERE archived_at IS NULL AND lower(name) = lower(${input.name}) AND id <> ${id}::uuid`)) as unknown as unknown[];
    if (dup) throw new AppError(409, "table_exists", "Nama meja sudah dipakai.");
    const rows = (await tx.execute(sql`UPDATE fnb.dining_tables SET name = ${input.name}, capacity = ${input.capacity ?? null} WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Meja");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.table.updated", targetType: "table", targetId: id, meta: { name: input.name } });
  });
}

export async function archiveTable(ctx: FnbContext, id: string) {
  needSettings(ctx);
  return inBusiness(ctx, async (tx) => {
    const [busy] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.orders WHERE table_id = ${id}::uuid AND status IN ${ACTIVE} LIMIT 1`)) as unknown as unknown[];
    if (busy) throw new AppError(409, "table_busy", "Meja masih dipakai pesanan. Selesaikan pesanannya dulu.");
    const rows = (await tx.execute(sql`UPDATE fnb.dining_tables SET archived_at = now() WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Meja");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.table.archived", targetType: "table", targetId: id, meta: {} });
  });
}

type Locked = { id: string; status: string; discount: number; paid: number; tableId: string | null; type: string; customerName: string | null; outletId: string; servicePercent: number; taxPercent: number };

async function lockOrder(tx: Parameters<Parameters<typeof withContext>[2]>[0], id: string): Promise<Locked> {
  const [o] = (await tx.execute(sql`
    SELECT o.id, o.status::text AS status, o.discount, o.table_id AS "tableId", o.type::text AS type, o.customer_name AS "customerName", o.outlet_id AS "outletId",
           o.service_percent::float8 AS "servicePercent", o.tax_percent::float8 AS "taxPercent",
           (SELECT coalesce(sum(p.amount), 0)::int FROM fnb.payments p WHERE p.order_id = o.id AND p.voided_at IS NULL) AS paid
    FROM fnb.orders o WHERE o.id = ${id}::uuid FOR UPDATE`)) as unknown as Locked[];
  if (!o) throw notFound("Pesanan");
  if (!["confirmed", "preparing", "ready", "served"].includes(o.status)) throw new AppError(409, "not_active", "Pesanan ini sudah selesai atau dibatalkan.");
  return o;
}
const editable = (o: Locked) => {
  if (o.paid > 0) throw new AppError(409, "has_payments", "Pesanan sudah ada pembayaran. Tidak bisa diubah susunannya.");
  if (o.discount > 0) throw new AppError(409, "has_discount", "Pesanan ber-diskon tidak bisa digabung atau dipisah.");
};

export async function moveOrder(ctx: FnbContext, orderId: string, tableId: string) {
  needSell(ctx);
  return inBusiness(ctx, async (tx) => {
    const o = await lockOrder(tx, orderId);
    const [t] = (await tx.execute(sql`SELECT id, name FROM fnb.dining_tables WHERE id = ${tableId}::uuid AND archived_at IS NULL`)) as unknown as { id: string; name: string }[];
    if (!t) throw notFound("Meja");
    const [busy] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.orders WHERE table_id = ${tableId}::uuid AND status IN ${ACTIVE} AND id <> ${orderId}::uuid LIMIT 1`)) as unknown as unknown[];
    if (busy) throw new AppError(409, "table_busy", "Meja tujuan sedang dipakai. Gunakan Gabung untuk menyatukan pesanan.");
    await tx.execute(sql`UPDATE fnb.orders SET table_id = ${tableId}::uuid, type = 'dine_in' WHERE id = ${orderId}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order.moved", targetType: "order", targetId: orderId, meta: { from: o.tableId, to: tableId } });
  });
}

/** Semua baris pindah ke pesanan tujuan. Pesanan asal ditutup (stok tetap terpakai, tidak dikembalikan). */
export async function mergeOrders(ctx: FnbContext, sourceId: string, targetId: string) {
  needSell(ctx);
  if (sourceId === targetId) throw new AppError(422, "same_order", "Pilih pesanan lain untuk digabung.");
  return inBusiness(ctx, async (tx) => {
    const ids = [sourceId, targetId].sort();
    const locked = new Map<string, Locked>();
    for (const id of ids) locked.set(id, await lockOrder(tx, id));
    const source = locked.get(sourceId)!, target = locked.get(targetId)!;
    editable(source); editable(target);
    if (source.outletId !== target.outletId) throw new AppError(409, "other_outlet", "Pesanan beda cabang tidak bisa digabung.");
    const [tn] = (await tx.execute(sql`SELECT receipt_no AS "receiptNo" FROM fnb.orders WHERE id = ${targetId}::uuid`)) as unknown as { receiptNo: string }[];
    await tx.execute(sql`UPDATE fnb.order_lines SET order_id = ${targetId}::uuid WHERE order_id = ${sourceId}::uuid`);
    await tx.execute(sql`UPDATE fnb.stock_movements SET reference_id = ${targetId}::uuid WHERE reference_type = 'order' AND reference_id = ${sourceId}::uuid`);
    const total = await repriceOrder(tx, targetId);
    await tx.execute(sql`
      UPDATE fnb.orders SET status = 'cancelled', cancelled_at = now(), cancel_reason = ${`Digabung ke ${tn!.receiptNo}`},
        subtotal = 0, discount = 0, service_charge = 0, tax = 0, total = 0 WHERE id = ${sourceId}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order.merged", targetType: "order", targetId, meta: { source: sourceId, total } });
    return { total };
  });
}

/** Baris terpilih pindah ke pesanan baru di meja yang sama, dengan nomor struk sendiri. */
export async function splitOrder(ctx: FnbContext, orderId: string, lineIds: string[]) {
  needSell(ctx);
  return inBusiness(ctx, async (tx) => {
    const o = await lockOrder(tx, orderId);
    editable(o);
    const lines = (await tx.execute(sql`SELECT id FROM fnb.order_lines WHERE order_id = ${orderId}::uuid`)) as unknown as { id: string }[];
    const picked = new Set(lineIds);
    if ([...picked].some((id) => !lines.some((l) => l.id === id))) throw notFound("Item pesanan");
    if (picked.size >= lines.length) throw new AppError(422, "split_all", "Sisakan minimal satu item di pesanan asal.");
    const settings = await readSettings(tx, ctx.businessId);
    const receiptNo = await nextReceiptNo(tx, ctx.businessId, settings.receiptPrefix);
    const [created] = (await tx.execute(sql`
      INSERT INTO fnb.orders (business_id, outlet_id, table_id, type, status, customer_name, service_percent, tax_percent, opened_by, receipt_no, subtotal, total)
      VALUES (${ctx.businessId}::uuid, ${o.outletId}::uuid, ${o.tableId}::uuid, ${o.type}::fnb.order_type, ${o.status}::fnb.order_status, ${o.customerName},
              ${o.servicePercent}, ${o.taxPercent}, ${ctx.userId}::uuid, ${receiptNo}, 0, 0) RETURNING id`)) as unknown as { id: string }[];
    await tx.execute(sql`UPDATE fnb.order_lines SET order_id = ${created!.id}::uuid WHERE id IN (${sql.join([...picked].map((id) => sql`${id}::uuid`), sql`, `)})`);
    await repriceOrder(tx, orderId);
    const total = await repriceOrder(tx, created!.id);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order.split", targetType: "order", targetId: orderId, meta: { newOrder: created!.id, receiptNo, lines: picked.size } });
    return { id: created!.id, receiptNo, total };
  });
}
