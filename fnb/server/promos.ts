import "server-only";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { CustomerInput, VoucherInput } from "@/lib/schemas";
import { computeTotals } from "@/lib/pricing";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type Customer = { id: string; name: string; phone: string | null; notes: string | null; orders: number; spent: number; lastVisit: string | null };
export type Voucher = {
  id: string; code: string; kind: "percent" | "amount"; value: number; minSpend: number; maxUses: number | null; usedCount: number;
  startsOn: string | null; endsOn: string | null; active: boolean;
};

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const needSell = (ctx: FnbContext) => { if (!can(ctx, "orders.sell")) throw forbidden(); };
const needPromos = (ctx: FnbContext) => { if (!can(ctx, "promos.manage")) throw forbidden(); };
const isDup = (e: unknown) => (e as { cause?: { code?: string } }).cause?.code === "23505";

export function listCustomers(ctx: FnbContext, search?: string): Promise<Customer[]> {
  needSell(ctx);
  const like = search?.trim() ? `%${search.trim().replace(/[%_\\]/g, "\\$&")}%` : null;
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT c.id, c.name, c.phone, c.notes,
           count(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS orders,
           coalesce(sum(o.total) FILTER (WHERE o.status <> 'cancelled'), 0)::int AS spent,
           max(o.opened_at) AS "lastVisit"
    FROM fnb.customers c LEFT JOIN fnb.orders o ON o.customer_id = c.id
    WHERE c.archived_at IS NULL ${like ? sql`AND (c.name ILIKE ${like} OR c.phone ILIKE ${like})` : sql``}
    GROUP BY c.id ORDER BY c.name LIMIT 300`)) as unknown as Customer[]);
}

export async function createCustomer(ctx: FnbContext, input: z.infer<typeof CustomerInput>) {
  needSell(ctx);
  try {
    return await inBusiness(ctx, async (tx) => {
      const [row] = (await tx.execute(sql`INSERT INTO fnb.customers (business_id, name, phone, notes) VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.phone ?? null}, ${input.notes ?? null}) RETURNING id`)) as unknown as { id: string }[];
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.customer.created", targetType: "customer", targetId: row!.id, meta: { name: input.name } });
      return { id: row!.id };
    });
  } catch (e) {
    if (isDup(e)) throw new AppError(409, "phone_exists", "Nomor telepon ini sudah terdaftar.");
    throw e;
  }
}

export async function updateCustomer(ctx: FnbContext, id: string, input: z.infer<typeof CustomerInput>) {
  needSell(ctx);
  try {
    await inBusiness(ctx, async (tx) => {
      const rows = (await tx.execute(sql`UPDATE fnb.customers SET name = ${input.name}, phone = ${input.phone ?? null}, notes = ${input.notes ?? null} WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
      if (!rows.length) throw notFound("Pelanggan");
    });
  } catch (e) {
    if (isDup(e)) throw new AppError(409, "phone_exists", "Nomor telepon ini sudah terdaftar.");
    throw e;
  }
}

export async function archiveCustomer(ctx: FnbContext, id: string) {
  needSell(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.customers SET archived_at = now() WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Pelanggan");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.customer.archived", targetType: "customer", targetId: id, meta: {} });
  });
}

const VOUCHER_COLS = sql`id, code, kind, value, min_spend AS "minSpend", max_uses AS "maxUses", used_count AS "usedCount",
  to_char(starts_on, 'YYYY-MM-DD') AS "startsOn", to_char(ends_on, 'YYYY-MM-DD') AS "endsOn", active`;

export function listVouchers(ctx: FnbContext): Promise<Voucher[]> {
  needPromos(ctx);
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`SELECT ${VOUCHER_COLS} FROM fnb.vouchers WHERE archived_at IS NULL ORDER BY created_at DESC`)) as unknown as Voucher[]);
}

export async function createVoucher(ctx: FnbContext, input: z.infer<typeof VoucherInput>) {
  needPromos(ctx);
  try {
    return await inBusiness(ctx, async (tx) => {
      const [row] = (await tx.execute(sql`
        INSERT INTO fnb.vouchers (business_id, code, kind, value, min_spend, max_uses, starts_on, ends_on)
        VALUES (${ctx.businessId}::uuid, ${input.code.trim().toUpperCase()}, ${input.kind}, ${input.value}, ${input.minSpend}, ${input.maxUses ?? null}, ${input.startsOn ?? null}::date, ${input.endsOn ?? null}::date)
        RETURNING id`)) as unknown as { id: string }[];
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.voucher.created", targetType: "voucher", targetId: row!.id, meta: { code: input.code, kind: input.kind, value: input.value } });
      return { id: row!.id };
    });
  } catch (e) {
    if (isDup(e)) throw new AppError(409, "code_exists", "Kode voucher sudah dipakai.");
    throw e;
  }
}

export async function setVoucherActive(ctx: FnbContext, id: string, active: boolean) {
  needPromos(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.vouchers SET active = ${active} WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Voucher");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.voucher.toggled", targetType: "voucher", targetId: id, meta: { active } });
  });
}

export async function archiveVoucher(ctx: FnbContext, id: string) {
  needPromos(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.vouchers SET archived_at = now(), active = false WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Voucher");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.voucher.archived", targetType: "voucher", targetId: id, meta: {} });
  });
}

type Found = { id: string; code: string; kind: "percent" | "amount"; value: number; minSpend: number; maxUses: number | null; usedCount: number; startsOn: string | null; endsOn: string | null; active: boolean };

/** Aturan voucher dicek di server saat pesanan dibuat; layar kasir hanya menampilkan pratinjau. */
async function validate(tx: Tx, code: string, subtotal: number, lock: boolean): Promise<Found> {
  const [v] = (await tx.execute(sql`SELECT ${VOUCHER_COLS} FROM fnb.vouchers WHERE code = ${code.trim().toUpperCase()} AND archived_at IS NULL ${lock ? sql`FOR UPDATE` : sql``}`)) as unknown as Found[];
  if (!v || !v.active) throw new AppError(422, "voucher_invalid", "Kode voucher tidak dikenal atau tidak aktif.");
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  if ((v.startsOn && today < v.startsOn) || (v.endsOn && today > v.endsOn)) throw new AppError(422, "voucher_expired", "Voucher belum berlaku atau sudah kedaluwarsa.");
  if (v.maxUses !== null && v.usedCount >= v.maxUses) throw new AppError(422, "voucher_used_up", "Kuota voucher sudah habis.");
  if (subtotal < v.minSpend) throw new AppError(422, "voucher_min", `Minimal belanja Rp${v.minSpend.toLocaleString("id-ID")} untuk voucher ini.`);
  return v;
}

export async function checkVoucher(ctx: FnbContext, code: string, subtotal: number) {
  needSell(ctx);
  return inBusiness(ctx, async (tx) => {
    const v = await validate(tx, code, subtotal, false);
    return { code: v.code, kind: v.kind, value: v.value, discount: computeTotals({ gross: subtotal, discountType: v.kind, discountValue: v.value, servicePercent: 0, taxPercent: 0 }).discount };
  });
}

/** Dipanggil di dalam transaksi pembuatan pesanan: memakai satu kuota secara atomik. */
export async function redeemVoucher(tx: Tx, code: string, subtotal: number) {
  const v = await validate(tx, code, subtotal, true);
  await tx.execute(sql`UPDATE fnb.vouchers SET used_count = used_count + 1 WHERE id = ${v.id}::uuid`);
  return v;
}

/** Pesanan batal mengembalikan kuota voucher. */
export async function releaseVoucher(tx: Tx, orderId: string) {
  await tx.execute(sql`
    UPDATE fnb.vouchers SET used_count = greatest(used_count - 1, 0)
    WHERE id = (SELECT voucher_id FROM fnb.orders WHERE id = ${orderId}::uuid)`);
}
