import "server-only";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { DiscountInput, DiscountQuoteInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type Discount = {
  id: string; name: string; kind: "percent" | "amount"; value: number; scope: "order" | "category" | "item";
  categoryId: string | null; categoryName: string | null; menuItemId: string | null; itemName: string | null;
  minSpend: number; days: number[]; startTime: string | null; endTime: string | null; startsOn: string | null; endsOn: string | null;
  orderTypeIds: string[]; autoApply: boolean; active: boolean; usedCount: number; givenTotal: number;
};
export type Applicable = { id: string; name: string; kind: "percent" | "amount"; value: number; scope: string; autoApply: boolean; amount: number };
export type DiscountLine = { menuItemId: string; categoryId: string; quantity: number; unitPrice: number };

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "promos.manage")) throw forbidden(); };
const dupe = (e: unknown): never => {
  if ((e as { cause?: { code?: string } }).cause?.code === "23505") throw new AppError(409, "duplicate", "Sudah ada diskon dengan nama itu.");
  throw e;
};

export async function listDiscounts(ctx: FnbContext): Promise<Discount[]> {
  need(ctx);
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT d.id, d.name, d.kind, d.value, d.scope, d.category_id AS "categoryId", c.name AS "categoryName", d.menu_item_id AS "menuItemId", i.name AS "itemName",
           d.min_spend AS "minSpend", d.days::int[] AS days, left(d.start_time::text, 5) AS "startTime", left(d.end_time::text, 5) AS "endTime",
           d.starts_on::text AS "startsOn", d.ends_on::text AS "endsOn", d.order_type_ids AS "orderTypeIds", d.auto_apply AS "autoApply", d.active,
           (SELECT count(*) FROM fnb.orders o WHERE o.discount_id = d.id AND o.status <> 'cancelled')::int AS "usedCount",
           coalesce((SELECT sum(o.discount) FROM fnb.orders o WHERE o.discount_id = d.id AND o.status <> 'cancelled'), 0)::int AS "givenTotal"
    FROM fnb.discounts d LEFT JOIN fnb.menu_categories c ON c.id = d.category_id LEFT JOIN fnb.menu_items i ON i.id = d.menu_item_id
    WHERE d.archived_at IS NULL ORDER BY d.active DESC, lower(d.name)`)) as unknown as Discount[]);
}

async function checkRefs(tx: Tx, input: z.infer<typeof DiscountInput>) {
  if (input.categoryId) {
    const rows = (await tx.execute(sql`SELECT 1 FROM fnb.menu_categories WHERE id = ${input.categoryId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
    if (!rows.length) throw new AppError(422, "invalid", "Kategori tidak ditemukan.");
  }
  if (input.menuItemId) {
    const rows = (await tx.execute(sql`SELECT 1 FROM fnb.menu_items WHERE id = ${input.menuItemId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
    if (!rows.length) throw new AppError(422, "invalid", "Menu tidak ditemukan.");
  }
  if (input.orderTypeIds.length) {
    const rows = (await tx.execute(sql`SELECT id FROM fnb.order_types WHERE archived_at IS NULL AND id IN (${sql.join(input.orderTypeIds.map((t) => sql`${t}::uuid`), sql`, `)})`)) as unknown as unknown[];
    if (rows.length !== new Set(input.orderTypeIds).size) throw new AppError(422, "invalid", "Tipe pesanan tidak ditemukan.");
  }
}

export async function saveDiscount(ctx: FnbContext, input: z.infer<typeof DiscountInput>, id?: string): Promise<{ id: string }> {
  need(ctx);
  const categoryId = input.scope === "category" ? input.categoryId ?? null : null;
  const menuItemId = input.scope === "item" ? input.menuItemId ?? null : null;
  const types = sql`ARRAY[${sql.join([...new Set(input.orderTypeIds)].map((t) => sql`${t}::uuid`), sql`, `)}]::uuid[]`;
  const days = sql`ARRAY[${sql.join([...new Set(input.days)].map((d) => sql`${d}`), sql`, `)}]::smallint[]`;
  return inBusiness(ctx, async (tx) => {
    await checkRefs(tx, { ...input, categoryId, menuItemId });
    const typesSql = input.orderTypeIds.length ? types : sql`'{}'::uuid[]`;
    let out: string;
    try {
      if (id) {
        const rows = (await tx.execute(sql`
          UPDATE fnb.discounts SET name = ${input.name}, kind = ${input.kind}, value = ${input.value}, scope = ${input.scope}, category_id = ${categoryId}::uuid, menu_item_id = ${menuItemId}::uuid,
            min_spend = ${input.minSpend}, days = ${days}, start_time = ${input.startTime || null}::time, end_time = ${input.endTime || null}::time,
            starts_on = ${input.startsOn || null}::date, ends_on = ${input.endsOn || null}::date, order_type_ids = ${typesSql}, auto_apply = ${input.autoApply}, active = ${input.active}
          WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as { id: string }[];
        if (!rows.length) throw notFound("Diskon");
        out = id;
      } else {
        const [row] = (await tx.execute(sql`
          INSERT INTO fnb.discounts (business_id, name, kind, value, scope, category_id, menu_item_id, min_spend, days, start_time, end_time, starts_on, ends_on, order_type_ids, auto_apply, active)
          VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.kind}, ${input.value}, ${input.scope}, ${categoryId}::uuid, ${menuItemId}::uuid, ${input.minSpend}, ${days},
                  ${input.startTime || null}::time, ${input.endTime || null}::time, ${input.startsOn || null}::date, ${input.endsOn || null}::date, ${typesSql}, ${input.autoApply}, ${input.active}) RETURNING id`)) as unknown as { id: string }[];
        out = row!.id;
      }
    } catch (e) {
      return dupe(e);
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: id ? "fnb.discount.updated" : "fnb.discount.created", targetType: "discount", targetId: out, meta: { name: input.name, kind: input.kind, value: input.value, scope: input.scope } });
    return { id: out };
  });
}

export async function archiveDiscount(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.discounts SET archived_at = now(), active = false WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Diskon");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.discount.archived", targetType: "discount", targetId: id });
  });
}

type Row = { id: string; name: string; kind: "percent" | "amount"; value: number; scope: string; categoryId: string | null; menuItemId: string | null; minSpend: number; days: number[];
  startTime: string | null; endTime: string | null; startsOn: string | null; endsOn: string | null; orderTypeIds: string[]; autoApply: boolean };

/** Waktu setempat (Jakarta) untuk jadwal diskon: hari 0=Minggu, jam HH:MM, tanggal YYYY-MM-DD. */
export function jakartaNow(now = new Date()) {
  const date = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const time = now.toLocaleTimeString("sv-SE", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).slice(0, 5);
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return { date, time, day };
}

const inWindow = (t: string, start: string, end: string) => (start <= end ? t >= start && t < end : t >= start || t < end);

/**
 * Diskon yang berlaku untuk isi pesanan ini, lengkap dengan nominalnya. Server yang memutuskan;
 * kasir hanya menampilkan dan memilih.
 */
export async function applicableDiscounts(tx: Tx, input: { lines: DiscountLine[]; orderTypeId: string | null; now?: Date }): Promise<Applicable[]> {
  const rows = (await tx.execute(sql`
    SELECT id, name, kind, value, scope, category_id AS "categoryId", menu_item_id AS "menuItemId", min_spend AS "minSpend", days::int[] AS days,
           left(start_time::text, 5) AS "startTime", left(end_time::text, 5) AS "endTime", starts_on::text AS "startsOn", ends_on::text AS "endsOn",
           order_type_ids AS "orderTypeIds", auto_apply AS "autoApply"
    FROM fnb.discounts WHERE active AND archived_at IS NULL`)) as unknown as Row[];
  const { date, time, day } = jakartaNow(input.now);
  const subtotal = input.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const out: Applicable[] = [];
  for (const d of rows) {
    if (!d.days.includes(day)) continue;
    if ((d.startsOn && date < d.startsOn) || (d.endsOn && date > d.endsOn)) continue;
    if (d.startTime && d.endTime && !inWindow(time, d.startTime, d.endTime)) continue;
    if (d.orderTypeIds.length && (!input.orderTypeId || !d.orderTypeIds.includes(input.orderTypeId))) continue;
    if (subtotal < d.minSpend) continue;
    const eligible = input.lines.filter((l) => (d.scope === "order" ? true : d.scope === "category" ? l.categoryId === d.categoryId : l.menuItemId === d.menuItemId)).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    if (eligible <= 0) continue;
    const raw = d.kind === "percent" ? Math.round((eligible * d.value) / 100) : d.value;
    out.push({ id: d.id, name: d.name, kind: d.kind, value: d.value, scope: d.scope, autoApply: d.autoApply, amount: Math.min(raw, eligible) });
  }
  return out.sort((a, b) => b.amount - a.amount);
}

/** Pratinjau untuk layar kasir: harga dihitung dari database seperti saat pesanan benar-benar dibuat. */
export async function quoteDiscounts(ctx: FnbContext, input: z.input<typeof DiscountQuoteInput>): Promise<Applicable[]> {
  if (!can(ctx, "orders.sell")) throw forbidden();
  return inBusiness(ctx, async (tx) => {
    const ids = [...new Set(input.lines.map((l) => l.menuItemId))];
    const items = (await tx.execute(sql`
      SELECT i.id, i.category_id AS "categoryId", coalesce(o.price, i.price) AS price
      FROM fnb.menu_items i LEFT JOIN fnb.outlet_items o ON o.menu_item_id = i.id AND o.outlet_id = (SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1)
      WHERE i.archived_at IS NULL AND i.id IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`)) as unknown as { id: string; categoryId: string; price: number }[];
    const modIds = [...new Set(input.lines.flatMap((l) => l.modifierIds ?? []))];
    const mods = modIds.length ? ((await tx.execute(sql`SELECT id, price_delta AS d FROM fnb.modifiers WHERE archived_at IS NULL AND id IN (${sql.join(modIds.map((m) => sql`${m}::uuid`), sql`, `)})`)) as unknown as { id: string; d: number }[]) : [];
    const lines: DiscountLine[] = input.lines.flatMap((l) => {
      const item = items.find((i) => i.id === l.menuItemId);
      if (!item) return [];
      return [{ menuItemId: item.id, categoryId: item.categoryId, quantity: l.quantity, unitPrice: item.price + (l.modifierIds ?? []).reduce((s, m) => s + (mods.find((x) => x.id === m)?.d ?? 0), 0) }];
    });
    return applicableDiscounts(tx, { lines, orderTypeId: input.orderTypeId ?? null });
  });
}
