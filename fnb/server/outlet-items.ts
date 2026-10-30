import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { OutletItemInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { forbidden, notFound } from "./errors";

export type OutletItem = { id: string; name: string; sku: string | null; categoryName: string; basePrice: number; baseCost: number; price: number | null; cost: number | null; isAvailable: boolean; trackStock: boolean; stock: number; minStock: number | null };

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "branches.manage") && !can(ctx, "catalog.manage")) throw forbidden(); };

/** Semua menu aktif dengan pengaturan khusus satu cabang (kosong = ikut harga dan HPP dasar menu). */
export async function listOutletItems(ctx: FnbContext, outletId: string): Promise<OutletItem[]> {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    const [o] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.outlets WHERE id = ${outletId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
    if (!o) throw notFound("Cabang");
    return (await tx.execute(sql`
      SELECT i.id, i.name, i.sku, c.name AS "categoryName", i.price AS "basePrice", i.cost AS "baseCost", o.price, o.cost, coalesce(o.is_available, true) AS "isAvailable",
             i.track_stock AS "trackStock", coalesce(o.stock, 0)::int AS stock, o.min_stock AS "minStock"
      FROM fnb.menu_items i JOIN fnb.menu_categories c ON c.id = i.category_id
      LEFT JOIN fnb.outlet_items o ON o.menu_item_id = i.id AND o.outlet_id = ${outletId}::uuid
      WHERE i.archived_at IS NULL ORDER BY c.sort_order, c.name, i.sort_order, i.name`)) as unknown as OutletItem[];
  });
}

export async function saveOutletItem(ctx: FnbContext, outletId: string, itemId: string, input: z.infer<typeof OutletItemInput>) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const [ok] = (await tx.execute(sql`SELECT (SELECT 1 FROM fnb.outlets WHERE id = ${outletId}::uuid AND archived_at IS NULL) AS o, (SELECT 1 FROM fnb.menu_items WHERE id = ${itemId}::uuid AND archived_at IS NULL) AS i`)) as unknown as { o: number | null; i: number | null }[];
    if (!ok?.o) throw notFound("Cabang");
    if (!ok.i) throw notFound("Menu");
    await tx.execute(sql`
      INSERT INTO fnb.outlet_items (business_id, outlet_id, menu_item_id, price, cost, is_available, min_stock)
      VALUES (${ctx.businessId}::uuid, ${outletId}::uuid, ${itemId}::uuid, ${input.price}, ${input.cost}, ${input.isAvailable}, ${input.minStock})
      ON CONFLICT (outlet_id, menu_item_id) DO UPDATE SET price = EXCLUDED.price, cost = EXCLUDED.cost, is_available = EXCLUDED.is_available, min_stock = EXCLUDED.min_stock`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.outlet_item.updated", targetType: "menu_item", targetId: itemId, meta: { outletId, price: input.price, cost: input.cost, isAvailable: input.isAvailable } });
  });
}
