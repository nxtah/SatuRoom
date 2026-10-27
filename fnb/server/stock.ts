import "server-only";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { IngredientInput, RecipeInput, StockAdjustInput } from "@/lib/schemas";
import { db } from "./db";
import type { FnbContext } from "./context";

export type Ingredient = {
  id: string; name: string; unit: string; stock: number; minimum: number; averageCost: number; low: boolean;
};
export type RecipeLine = { ingredientId: string; name: string; unit: string; quantity: number };
export type StockItem = { id: string; name: string; lines: RecipeLine[] };
export type Movement = {
  id: string; ingredientName: string; unit: string; quantity: number; reason: string; createdAt: string;
};
export type StockData = { ingredients: Ingredient[]; items: StockItem[]; movements: Movement[] };

const canManage = (ctx: FnbContext) => ctx.roles.some((r) => ["owner", "manager", "inventory"].includes(r));
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

export function listStock(ctx: FnbContext): Promise<StockData> {
  return inBusiness(ctx, async (tx) => {
    const ingredients = (await tx.execute(sql`
      SELECT id, name, unit, stock::float8 AS stock, minimum_stock::float8 AS minimum,
             average_cost AS "averageCost", (stock <= minimum_stock) AS low
      FROM fnb.ingredients WHERE archived_at IS NULL ORDER BY name
    `)) as unknown as Ingredient[];
    const items = (await tx.execute(sql`
      SELECT id, name FROM fnb.menu_items WHERE archived_at IS NULL ORDER BY name
    `)) as unknown as { id: string; name: string }[];
    const lines = (await tx.execute(sql`
      SELECT r.menu_item_id AS "menuItemId", r.ingredient_id AS "ingredientId", i.name, i.unit,
             r.quantity::float8 AS quantity
      FROM fnb.recipes r JOIN fnb.ingredients i ON i.id = r.ingredient_id
      ORDER BY i.name
    `)) as unknown as (RecipeLine & { menuItemId: string })[];
    const movements = (await tx.execute(sql`
      SELECT m.id, i.name AS "ingredientName", i.unit, m.quantity::float8 AS quantity, m.reason,
             m.created_at AS "createdAt"
      FROM fnb.stock_movements m JOIN fnb.ingredients i ON i.id = m.ingredient_id
      ORDER BY m.created_at DESC LIMIT 20
    `)) as unknown as Movement[];
    return {
      ingredients,
      items: items.map((item) => ({
        ...item,
        lines: lines.filter((l) => l.menuItemId === item.id).map(({ menuItemId, ...l }) => l),
      })),
      movements,
    };
  });
}

export async function createIngredient(ctx: FnbContext, input: z.infer<typeof IngredientInput>) {
  if (!canManage(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const outlet = (await tx.execute(sql`SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    if (!outlet[0]) throw new Error("NO_OUTLET");
    const opening = input.openingStock ?? 0;
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.ingredients (business_id, outlet_id, name, unit, stock, minimum_stock, average_cost)
      VALUES (${ctx.businessId}::uuid, ${outlet[0].id}::uuid, ${input.name}, ${input.unit},
              ${opening}, ${input.minimumStock ?? 0}, ${input.averageCost ?? 0})
      RETURNING id
    `)) as unknown as { id: string }[];
    if (opening > 0) await recordMovement(tx, ctx, row!.id, opening, "Stok awal");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.ingredient.created",
      targetType: "ingredient", targetId: row!.id, meta: { name: input.name, unit: input.unit },
    });
    return { id: row!.id };
  });
}

/** `quantity` bertanda: positif menambah stok, negatif mengurangi. */
export async function adjustStock(ctx: FnbContext, ingredientId: string, input: z.infer<typeof StockAdjustInput>) {
  if (!canManage(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT id, stock::float8 AS stock FROM fnb.ingredients
      WHERE id = ${ingredientId}::uuid AND archived_at IS NULL FOR UPDATE
    `)) as unknown as { id: string; stock: number }[];
    if (!rows[0]) throw new Error("NOT_FOUND");
    const after = rows[0].stock + input.quantity;
    if (after < 0) throw new Error("BELOW_ZERO");
    await recordMovement(tx, ctx, ingredientId, input.quantity, input.reason);
    await tx.execute(sql`UPDATE fnb.ingredients SET stock = ${after} WHERE id = ${ingredientId}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.stock.adjusted",
      targetType: "ingredient", targetId: ingredientId, meta: { quantity: input.quantity, reason: input.reason, after },
    });
    return { stock: after };
  });
}

export async function setRecipe(ctx: FnbContext, input: z.infer<typeof RecipeInput>) {
  if (!canManage(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const item = (await tx.execute(sql`
      SELECT id FROM fnb.menu_items WHERE id = ${input.menuItemId}::uuid AND archived_at IS NULL
    `)) as unknown as { id: string }[];
    if (!item[0]) throw new Error("NOT_FOUND");
    await tx.execute(sql`DELETE FROM fnb.recipes WHERE menu_item_id = ${input.menuItemId}::uuid`);
    for (const line of input.lines) {
      await tx.execute(sql`
        INSERT INTO fnb.recipes (business_id, menu_item_id, ingredient_id, quantity)
        VALUES (${ctx.businessId}::uuid, ${input.menuItemId}::uuid, ${line.ingredientId}::uuid, ${line.quantity})
      `);
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.recipe.updated",
      targetType: "menu_item", targetId: input.menuItemId, meta: { lines: input.lines.length },
    });
  });
}

async function recordMovement(tx: Tx, ctx: FnbContext, ingredientId: string, quantity: number, reason: string) {
  await tx.execute(sql`
    INSERT INTO fnb.stock_movements (business_id, ingredient_id, quantity, reason, recorded_by)
    VALUES (${ctx.businessId}::uuid, ${ingredientId}::uuid, ${quantity}, ${reason}, ${ctx.userId}::uuid)
  `);
}

/**
 * Dipanggil saat pesanan dibuat: stok bahan dipotong sesuai resep masing-masing menu.
 * Satu transaksi dengan pesanan agar stok tidak pernah terpotong tanpa pesanan.
 */
export async function deductOrderStock(
  tx: Tx,
  ctx: FnbContext,
  orderId: string,
  lines: { menuItemId: string; quantity: number }[],
) {
  if (!lines.length) return;
  const recipes = (await tx.execute(sql`
    SELECT menu_item_id AS "menuItemId", ingredient_id AS "ingredientId", quantity::float8 AS quantity
    FROM fnb.recipes WHERE menu_item_id IN (${sql.join(lines.map((l) => sql`${l.menuItemId}::uuid`), sql`, `)})
  `)) as unknown as { menuItemId: string; ingredientId: string; quantity: number }[];
  if (!recipes.length) return;
  const needed = new Map<string, number>();
  for (const line of lines) {
    for (const recipe of recipes.filter((r) => r.menuItemId === line.menuItemId)) {
      needed.set(recipe.ingredientId, (needed.get(recipe.ingredientId) ?? 0) + recipe.quantity * line.quantity);
    }
  }
  const ids = [...needed.keys()].sort();
  const locked = (await tx.execute(sql`
    SELECT id, stock::float8 AS stock FROM fnb.ingredients
    WHERE id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}) ORDER BY id FOR UPDATE
  `)) as unknown as { id: string; stock: number }[];
  const stockOf = new Map(locked.map((r) => [r.id, r.stock]));
  for (const id of ids) {
    if ((stockOf.get(id) ?? 0) < Math.round(needed.get(id)! * 1000) / 1000) throw new Error("INSUFFICIENT_STOCK");
  }
  for (const ingredientId of ids) {
    const rounded = Math.round(needed.get(ingredientId)! * 1000) / 1000;
    await tx.execute(sql`
      INSERT INTO fnb.stock_movements (business_id, ingredient_id, quantity, reason, reference_type, reference_id, recorded_by)
      VALUES (${ctx.businessId}::uuid, ${ingredientId}::uuid, ${-rounded}, 'Terjual', 'order', ${orderId}::uuid, ${ctx.userId}::uuid)
    `);
    await tx.execute(sql`
      UPDATE fnb.ingredients SET stock = stock - ${rounded} WHERE id = ${ingredientId}::uuid
    `);
  }
  await hideSoldOutItems(tx, ids);
}

/** Menu yang bahannya tidak cukup untuk satu porsi otomatis ditandai habis. */
async function hideSoldOutItems(tx: Tx, ingredientIds: string[]) {
  await tx.execute(sql`
    UPDATE fnb.menu_items SET is_available = false
    WHERE is_available AND id IN (
      SELECT r.menu_item_id FROM fnb.recipes r JOIN fnb.ingredients i ON i.id = r.ingredient_id
      WHERE r.ingredient_id IN (${sql.join(ingredientIds.map((id) => sql`${id}::uuid`), sql`, `)}) AND i.stock < r.quantity
    )
  `);
}

/** Pesanan dibatalkan: stok yang terpotong untuk pesanan itu dikembalikan. */
export async function restoreOrderStock(tx: Tx, ctx: FnbContext, orderId: string) {
  const sold = (await tx.execute(sql`
    SELECT ingredient_id AS "ingredientId", -quantity::float8 AS quantity
    FROM fnb.stock_movements WHERE reference_type = 'order' AND reference_id = ${orderId}::uuid AND quantity < 0
    ORDER BY ingredient_id
  `)) as unknown as { ingredientId: string; quantity: number }[];
  for (const row of sold) {
    await tx.execute(sql`
      INSERT INTO fnb.stock_movements (business_id, ingredient_id, quantity, reason, reference_type, reference_id, recorded_by)
      VALUES (${ctx.businessId}::uuid, ${row.ingredientId}::uuid, ${row.quantity}, 'Pesanan dibatalkan', 'order_cancel', ${orderId}::uuid, ${ctx.userId}::uuid)
    `);
    await tx.execute(sql`UPDATE fnb.ingredients SET stock = stock + ${row.quantity} WHERE id = ${row.ingredientId}::uuid`);
  }
}
