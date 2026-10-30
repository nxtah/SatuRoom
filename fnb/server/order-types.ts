import "server-only";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { OrderTypeInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type OrderType = { id: string; name: string; kind: "dine_in" | "takeaway" | "pickup"; servicePercent: number | null; taxPercent: number | null; requireTable: boolean; isActive: boolean; sortOrder: number; usedCount: number };
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const manage = (ctx: FnbContext) => { if (!can(ctx, "settings.manage")) throw forbidden(); };

const DEFAULTS = [["Makan di tempat", "dine_in", false], ["Bungkus", "takeaway", false], ["Ambil sendiri", "pickup", false]] as const;

/** Bisnis baru mendapat tiga tipe dasar saat pertama kali dibuka, supaya kasir tidak mulai dari kosong. */
async function ensureDefaults(tx: Tx, businessId: string) {
  const [n] = (await tx.execute(sql`SELECT count(*)::int AS n FROM fnb.order_types`)) as unknown as { n: number }[];
  if (n!.n) return;
  for (const [i, [name, kind, req]] of DEFAULTS.entries()) {
    await tx.execute(sql`INSERT INTO fnb.order_types (business_id, name, kind, require_table, sort_order) VALUES (${businessId}::uuid, ${name}, ${kind}::fnb.order_type, ${req}, ${i}) ON CONFLICT DO NOTHING`);
  }
}

export function listOrderTypes(ctx: FnbContext, opts: { onlyActive?: boolean } = {}): Promise<OrderType[]> {
  return inBusiness(ctx, async (tx) => {
    await ensureDefaults(tx, ctx.businessId);
    return (await tx.execute(sql`
      SELECT t.id, t.name, t.kind, t.service_percent::float8 AS "servicePercent", t.tax_percent::float8 AS "taxPercent", t.require_table AS "requireTable",
             t.is_active AS "isActive", t.sort_order AS "sortOrder", (SELECT count(*) FROM fnb.orders o WHERE o.order_type_id = t.id)::int AS "usedCount"
      FROM fnb.order_types t WHERE t.archived_at IS NULL AND (${!opts.onlyActive} OR t.is_active) ORDER BY t.sort_order, t.name`)) as unknown as OrderType[];
  });
}

const dupe = (e: unknown): never => {
  if ((e as { cause?: { code?: string } }).cause?.code === "23505") throw new AppError(409, "duplicate", "Sudah ada tipe pesanan dengan nama itu.");
  throw e;
};

export async function saveOrderType(ctx: FnbContext, input: z.infer<typeof OrderTypeInput>, id?: string): Promise<{ id: string }> {
  manage(ctx);
  return inBusiness(ctx, async (tx) => {
    await ensureDefaults(tx, ctx.businessId);
    let result: string;
    try {
      if (id) {
        const rows = (await tx.execute(sql`
          UPDATE fnb.order_types SET name = ${input.name}, kind = ${input.kind}::fnb.order_type, service_percent = ${input.servicePercent ?? null}, tax_percent = ${input.taxPercent ?? null},
            require_table = ${input.requireTable}, is_active = ${input.isActive}, sort_order = ${input.sortOrder} WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as { id: string }[];
        if (!rows.length) throw notFound("Tipe pesanan");
        result = id;
      } else {
        const [row] = (await tx.execute(sql`
          INSERT INTO fnb.order_types (business_id, name, kind, service_percent, tax_percent, require_table, is_active, sort_order)
          VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.kind}::fnb.order_type, ${input.servicePercent ?? null}, ${input.taxPercent ?? null}, ${input.requireTable}, ${input.isActive}, ${input.sortOrder}) RETURNING id`)) as unknown as { id: string }[];
        result = row!.id;
      }
    } catch (e) {
      return dupe(e);
    }
    const [active] = (await tx.execute(sql`SELECT count(*)::int AS n FROM fnb.order_types WHERE archived_at IS NULL AND is_active`)) as unknown as { n: number }[];
    if (!active!.n) throw new AppError(409, "last_type", "Minimal satu tipe pesanan harus aktif.");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: id ? "fnb.order_type.updated" : "fnb.order_type.created", targetType: "order_type", targetId: result, meta: { name: input.name } });
    return { id: result };
  });
}

/** Tipe yang pernah dipakai pesanan tidak dihapus; hanya disembunyikan. Pesanan lama tetap menyimpan namanya. */
export async function archiveOrderType(ctx: FnbContext, id: string) {
  manage(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.order_types SET archived_at = now(), is_active = false WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Tipe pesanan");
    const [active] = (await tx.execute(sql`SELECT count(*)::int AS n FROM fnb.order_types WHERE archived_at IS NULL AND is_active`)) as unknown as { n: number }[];
    if (!active!.n) throw new AppError(409, "last_type", "Minimal satu tipe pesanan harus aktif.");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.order_type.archived", targetType: "order_type", targetId: id });
  });
}

export type ResolvedType = { id: string | null; name: string | null; kind: "dine_in" | "takeaway" | "pickup"; servicePercent: number | null; taxPercent: number | null; requireTable: boolean };

/** Dipakai saat pesanan dibuat. Tanpa orderTypeId, jenis dasar dari `type` dipakai dengan tarif umum. */
export async function resolveOrderType(tx: Tx, orderTypeId: string | null | undefined, fallbackKind: ResolvedType["kind"]): Promise<ResolvedType> {
  if (!orderTypeId) return { id: null, name: null, kind: fallbackKind, servicePercent: null, taxPercent: null, requireTable: false };
  const [t] = (await tx.execute(sql`SELECT id, name, kind, service_percent::float8 AS "servicePercent", tax_percent::float8 AS "taxPercent", require_table AS "requireTable"
    FROM fnb.order_types WHERE id = ${orderTypeId}::uuid AND archived_at IS NULL AND is_active`)) as unknown as ResolvedType[];
  if (!t) throw new AppError(422, "order_type_invalid", "Tipe pesanan tidak tersedia. Muat ulang halaman kasir.");
  return t;
}
