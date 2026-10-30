import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { ItemGroupsInput, ModifierGroupInput } from "@/lib/schemas";
import { cleanImageUrl } from "./cloudinary";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export interface ModifierGroup {
  id: string;
  name: string;
  description: string | null;
  minSelect: number;
  maxSelect: number;
  modifiers: { id: string; name: string; priceDelta: number; available: boolean; sku: string | null; cost: number; imageUrl: string | null; ingredientId: string | null; ingredientQty: number | null }[];
  itemIds: string[];
}

type Tx = Parameters<Parameters<typeof withContext>[2]>[0];
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const manage = (ctx: FnbContext) => {
  if (!can(ctx, "catalog.manage")) throw forbidden();
};

/** Dipakai POS dan halaman Menu. Hanya grup dan opsi yang masih aktif. */
export async function listGroups(tx: Tx): Promise<ModifierGroup[]> {
  const groups = (await tx.execute(sql`
    SELECT id, name, description, min_select AS "minSelect", max_select AS "maxSelect"
    FROM fnb.modifier_groups WHERE archived_at IS NULL ORDER BY lower(name)`)) as unknown as Omit<ModifierGroup, "modifiers" | "itemIds">[];
  if (!groups.length) return [];
  const mods = (await tx.execute(sql`
    SELECT id, group_id AS "groupId", name, price_delta AS "priceDelta", is_available AS available, sku, cost, image_url AS "imageUrl",
           ingredient_id AS "ingredientId", ingredient_qty::float8 AS "ingredientQty"
    FROM fnb.modifiers WHERE archived_at IS NULL ORDER BY sort_order, name`)) as unknown as (ModifierGroup["modifiers"][number] & { groupId: string })[];
  const links = (await tx.execute(sql`SELECT group_id AS "groupId", menu_item_id AS "itemId" FROM fnb.menu_item_groups`)) as unknown as { groupId: string; itemId: string }[];
  return groups.map((g) => ({
    ...g,
    modifiers: mods.filter((m) => m.groupId === g.id).map(({ groupId, ...m }) => m),
    itemIds: links.filter((l) => l.groupId === g.id).map((l) => l.itemId),
  }));
}

export function listModifierGroups(ctx: FnbContext): Promise<ModifierGroup[]> {
  return inBusiness(ctx, listGroups);
}

/** Simpan grup beserta opsinya sekaligus. Opsi yang tidak lagi dikirim diarsipkan, riwayat struk tetap utuh. */
export async function saveModifierGroup(ctx: FnbContext, input: z.input<typeof ModifierGroupInput>): Promise<{ id: string }> {
  manage(ctx);
  return inBusiness(ctx, async (tx) => {
    let id = input.id;
    if (id) {
      const rows = (await tx.execute(sql`
        UPDATE fnb.modifier_groups SET name = ${input.name}, description = ${input.description || null}, min_select = ${input.minSelect}, max_select = ${input.maxSelect}
        WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
      if (!rows.length) throw notFound("Grup pilihan");
    } else {
      const [row] = (await tx.execute(sql`
        INSERT INTO fnb.modifier_groups (business_id, name, description, min_select, max_select)
        VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.description || null}, ${input.minSelect}, ${input.maxSelect}) RETURNING id`)) as unknown as { id: string }[];
      id = row!.id;
    }
    const keep: string[] = [];
    for (const [index, m] of input.modifiers.entries()) {
      if (m.id) {
        const rows = (await tx.execute(sql`
          UPDATE fnb.modifiers SET name = ${m.name}, price_delta = ${m.priceDelta}, is_available = ${m.available ?? true}, sort_order = ${index}, archived_at = NULL,
            sku = ${m.sku?.trim() || null}, cost = ${m.cost ?? 0}, image_url = ${cleanImageUrl(ctx, m.imageUrl)}, ingredient_id = ${m.ingredientId ?? null}::uuid, ingredient_qty = ${m.ingredientQty ?? null}
          WHERE id = ${m.id}::uuid AND group_id = ${id}::uuid RETURNING id`)) as unknown as unknown[];
        if (!rows.length) throw notFound("Opsi");
        keep.push(m.id);
      } else {
        const [row] = (await tx.execute(sql`
          INSERT INTO fnb.modifiers (business_id, group_id, name, price_delta, is_available, sort_order, sku, cost, image_url, ingredient_id, ingredient_qty)
          VALUES (${ctx.businessId}::uuid, ${id}::uuid, ${m.name}, ${m.priceDelta}, ${m.available ?? true}, ${index}, ${m.sku?.trim() || null}, ${m.cost ?? 0}, ${cleanImageUrl(ctx, m.imageUrl)}, ${m.ingredientId ?? null}::uuid, ${m.ingredientQty ?? null}) RETURNING id`)) as unknown as { id: string }[];
        keep.push(row!.id);
      }
    }
    await tx.execute(sql`
      UPDATE fnb.modifiers SET archived_at = now()
      WHERE group_id = ${id}::uuid AND archived_at IS NULL AND id NOT IN (${sql.join(keep.map((k) => sql`${k}::uuid`), sql`, `)})`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: input.id ? "fnb.modifier_group.updated" : "fnb.modifier_group.created",
      targetType: "modifier_group", targetId: id, meta: { name: input.name, options: input.modifiers.length },
    });
    return { id };
  });
}

export async function archiveModifierGroup(ctx: FnbContext, id: string): Promise<void> {
  manage(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.modifier_groups SET archived_at = now() WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Grup pilihan");
    await tx.execute(sql`DELETE FROM fnb.menu_item_groups WHERE group_id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.modifier_group.archived", targetType: "modifier_group", targetId: id });
  });
}

export async function setItemGroups(ctx: FnbContext, itemId: string, input: z.infer<typeof ItemGroupsInput>): Promise<void> {
  manage(ctx);
  const groupIds = [...new Set(input.groupIds)];
  await inBusiness(ctx, async (tx) => {
    const item = (await tx.execute(sql`SELECT 1 FROM fnb.menu_items WHERE id = ${itemId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
    if (!item.length) throw notFound("Menu");
    if (groupIds.length) {
      const found = (await tx.execute(sql`
        SELECT id FROM fnb.modifier_groups WHERE archived_at IS NULL AND id IN (${sql.join(groupIds.map((g) => sql`${g}::uuid`), sql`, `)})`)) as unknown as unknown[];
      if (found.length !== groupIds.length) throw notFound("Grup pilihan");
    }
    await tx.execute(sql`DELETE FROM fnb.menu_item_groups WHERE menu_item_id = ${itemId}::uuid`);
    for (const [index, groupId] of groupIds.entries()) {
      await tx.execute(sql`INSERT INTO fnb.menu_item_groups (business_id, menu_item_id, group_id, sort_order) VALUES (${ctx.businessId}::uuid, ${itemId}::uuid, ${groupId}::uuid, ${index})`);
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.item.groups_changed", targetType: "menu_item", targetId: itemId, meta: { groupIds } });
  });
}

/**
 * Memeriksa pilihan pelanggan terhadap aturan grup menu dan mengembalikan salinan opsi + tambahan harga.
 * Server yang memutuskan harga; angka dari layar tidak dipercaya.
 */
export async function resolveModifiers(tx: Tx, itemId: string, modifierIds: string[]) {
  const ids = [...new Set(modifierIds)];
  const groups = (await tx.execute(sql`
    SELECT g.id, g.name, g.min_select AS "min", g.max_select AS "max"
    FROM fnb.menu_item_groups l JOIN fnb.modifier_groups g ON g.id = l.group_id
    WHERE l.menu_item_id = ${itemId}::uuid AND g.archived_at IS NULL`)) as unknown as { id: string; name: string; min: number; max: number }[];
  const chosen = ids.length
    ? ((await tx.execute(sql`
        SELECT m.id, m.name, m.price_delta AS "priceDelta", m.cost, m.group_id AS "groupId", m.is_available AS available
        FROM fnb.modifiers m WHERE m.archived_at IS NULL AND m.id IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`)) as unknown as {
        id: string; name: string; priceDelta: number; cost: number; groupId: string; available: boolean;
      }[])
    : [];
  if (chosen.length !== ids.length) throw new AppError(422, "modifier_invalid", "Ada pilihan menu yang sudah tidak tersedia. Muat ulang halaman.");
  for (const m of chosen) {
    if (!groups.some((g) => g.id === m.groupId)) throw new AppError(422, "modifier_invalid", "Pilihan tidak cocok dengan menu ini.");
    if (!m.available) throw new AppError(422, "modifier_unavailable", `Pilihan ${m.name} sedang habis.`);
  }
  for (const g of groups) {
    const count = chosen.filter((m) => m.groupId === g.id).length;
    if (count < g.min) throw new AppError(422, "modifier_min", `${g.name}: pilih minimal ${g.min}.`);
    if (count > g.max) throw new AppError(422, "modifier_max", `${g.name}: pilih maksimal ${g.max}.`);
  }
  return { rows: chosen.map(({ id, name, priceDelta }) => ({ id, name, priceDelta })), delta: chosen.reduce((s, m) => s + m.priceDelta, 0), cost: chosen.reduce((s, m) => s + m.cost, 0) };
}
