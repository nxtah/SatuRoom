import "server-only";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { ItemStockInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

export type ItemStockRow = { id: string; name: string; sku: string | null; categoryName: string; stock: number; minStock: number; low: boolean };

/** Stok barang jadi (menu dengan "lacak stok") di satu cabang. */
export function listItemStock(ctx: FnbContext, outletId: string): Promise<ItemStockRow[]> {
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT i.id, i.name, i.sku, c.name AS "categoryName", coalesce(o.stock, 0)::int AS stock,
           coalesce(o.min_stock, i.min_stock)::int AS "minStock", (coalesce(o.stock, 0) <= coalesce(o.min_stock, i.min_stock)) AS low
    FROM fnb.menu_items i JOIN fnb.menu_categories c ON c.id = i.category_id
    LEFT JOIN fnb.outlet_items o ON o.menu_item_id = i.id AND o.outlet_id = ${outletId}::uuid
    WHERE i.archived_at IS NULL AND i.track_stock ORDER BY c.sort_order, c.name, i.name`)) as unknown as ItemStockRow[]);
}

/** Tambah/kurangi stok barang jadi dengan alasan. Selalu lewat ledger; angka stok tidak diedit langsung. */
export async function adjustItemStock(ctx: FnbContext, itemId: string, input: z.infer<typeof ItemStockInput>, outletArg?: string) {
  if (!can(ctx, "stock.manage")) throw forbidden();
  await inBusiness(ctx, async (tx) => {
    const outletId = outletArg ?? (await primaryOutlet(tx));
    const [item] = (await tx.execute(sql`SELECT track_stock AS t FROM fnb.menu_items WHERE id = ${itemId}::uuid AND archived_at IS NULL`)) as unknown as { t: boolean }[];
    if (!item) throw notFound("Menu");
    if (!item.t) throw new AppError(422, "not_tracked", "Aktifkan 'lacak stok' di menu ini dulu.");
    await changeItemStock(tx, ctx, outletId, itemId, input.quantity, input.reason, "adjust", null);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.item_stock.adjusted", targetType: "menu_item", targetId: itemId, meta: { quantity: input.quantity, reason: input.reason, outletId } });
  });
}

export async function primaryOutlet(tx: Tx): Promise<string> {
  const [o] = (await tx.execute(sql`SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
  if (!o) throw new Error("NO_OUTLET");
  return o.id;
}

/** Satu pintu perubahan stok barang jadi: kunci baris, tolak jika jadi minus, catat ledger, atur status habis (hanya mengikuti stok cabang utama, yang dipakai kasir). */
export async function changeItemStock(tx: Tx, ctx: FnbContext, outletId: string, itemId: string, quantity: number, reason: string, refType: string, refId: string | null) {
  await tx.execute(sql`INSERT INTO fnb.outlet_items (business_id, outlet_id, menu_item_id) VALUES (${ctx.businessId}::uuid, ${outletId}::uuid, ${itemId}::uuid) ON CONFLICT DO NOTHING`);
  const [row] = (await tx.execute(sql`SELECT stock FROM fnb.outlet_items WHERE outlet_id = ${outletId}::uuid AND menu_item_id = ${itemId}::uuid FOR UPDATE`)) as unknown as { stock: number }[];
  if (row!.stock + quantity < 0) throw new Error("INSUFFICIENT_STOCK");
  await tx.execute(sql`UPDATE fnb.outlet_items SET stock = stock + ${quantity} WHERE outlet_id = ${outletId}::uuid AND menu_item_id = ${itemId}::uuid`);
  await tx.execute(sql`INSERT INTO fnb.item_stock_movements (business_id, outlet_id, menu_item_id, quantity, reason, reference_type, reference_id, recorded_by)
    VALUES (${ctx.businessId}::uuid, ${outletId}::uuid, ${itemId}::uuid, ${quantity}, ${reason}, ${refType}, ${refId}::uuid, ${ctx.userId}::uuid)`);
  await tx.execute(sql`UPDATE fnb.menu_items SET is_available = ${row!.stock + quantity > 0} WHERE id = ${itemId}::uuid AND track_stock AND archived_at IS NULL AND is_available <> ${row!.stock + quantity > 0} AND ${outletId}::uuid = (SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1)`);
}

/** Dipanggil saat pesanan dibuat: barang jadi yang dilacak dipotong dari stok cabang. */
export async function deductTrackedItems(tx: Tx, ctx: FnbContext, outletId: string, orderId: string, lines: { menuItemId: string; quantity: number }[]) {
  const qty = new Map<string, number>();
  for (const l of lines) qty.set(l.menuItemId, (qty.get(l.menuItemId) ?? 0) + l.quantity);
  const tracked = (await tx.execute(sql`SELECT id FROM fnb.menu_items WHERE track_stock AND id IN (${sql.join([...qty.keys()].map((k) => sql`${k}::uuid`), sql`, `)}) ORDER BY id`)) as unknown as { id: string }[];
  for (const t of tracked) await changeItemStock(tx, ctx, outletId, t.id, -qty.get(t.id)!, "Terjual", "order", orderId);
}

export async function restoreTrackedItems(tx: Tx, ctx: FnbContext, orderId: string) {
  const sold = (await tx.execute(sql`SELECT outlet_id AS "outletId", menu_item_id AS "itemId", -quantity AS quantity FROM fnb.item_stock_movements WHERE reference_type = 'order' AND reference_id = ${orderId}::uuid AND quantity < 0 ORDER BY menu_item_id`)) as unknown as { outletId: string; itemId: string; quantity: number }[];
  for (const r of sold) await changeItemStock(tx, ctx, r.outletId, r.itemId, r.quantity, "Pesanan dibatalkan", "order_cancel", orderId);
}
