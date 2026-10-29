import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { PaymentInput, ShiftCloseInput, ShiftOpenInput, VoidPaymentInput } from "@/lib/schemas";
import { db } from "./db";
import { can, type FnbContext } from "./context";

export type Shift = {
  id: string; openedAt: string; openingCash: number; closedAt: string | null; closingCash: number | null; notes: string | null;
};
export type ShiftSummary = {
  shift: Shift | null; salesTotal: number; cashTotal: number; nonCashTotal: number; orderCount: number; expectedCash: number;
};

const canCash = (ctx: FnbContext) => can(ctx, "cash.manage");
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

export function currentShiftSummary(ctx: FnbContext): Promise<ShiftSummary> {
  return inBusiness(ctx, async (tx) => {
    const shifts = (await tx.execute(sql`
      SELECT id, opened_at AS "openedAt", opening_cash AS "openingCash", closed_at AS "closedAt",
             closing_cash AS "closingCash", notes
      FROM fnb.cash_shifts WHERE closed_at IS NULL ORDER BY opened_at DESC LIMIT 1
    `)) as unknown as Shift[];
    const shift = shifts[0] ?? null;
    if (!shift) return { shift: null, salesTotal: 0, cashTotal: 0, nonCashTotal: 0, orderCount: 0, expectedCash: 0 };
    const totals = (await tx.execute(sql`
      SELECT coalesce(sum(p.amount), 0) AS total,
             coalesce(sum(p.amount) FILTER (WHERE p.method = 'cash'), 0) AS cash,
             count(DISTINCT p.order_id) AS orders
      FROM fnb.payments p WHERE p.shift_id = ${shift.id}::uuid AND p.voided_at IS NULL
    `)) as unknown as { total: string; cash: string; orders: string }[];
    const total = Number(totals[0]?.total ?? 0), cash = Number(totals[0]?.cash ?? 0), orders = Number(totals[0]?.orders ?? 0);
    return { shift, salesTotal: total, cashTotal: cash, nonCashTotal: total - cash, orderCount: orders, expectedCash: shift.openingCash + cash };
  });
}

export async function openShift(ctx: FnbContext, input: z.infer<typeof ShiftOpenInput>) {
  if (!canCash(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const existing = await tx.execute(sql`SELECT 1 FROM fnb.cash_shifts WHERE closed_at IS NULL`);
    if ((existing as unknown as unknown[]).length) throw new Error("SHIFT_OPEN");
    const outlet = (await tx.execute(sql`SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    if (!outlet[0]) throw new Error("NO_OUTLET");
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.cash_shifts (business_id, outlet_id, opened_by, opening_cash)
      VALUES (${ctx.businessId}::uuid, ${outlet[0].id}::uuid, ${ctx.userId}::uuid, ${input.openingCash}) RETURNING id
    `)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.shift.opened", targetType: "cash_shift", targetId: row!.id, meta: { openingCash: input.openingCash } });
    return { id: row!.id };
  });
}

export async function closeShift(ctx: FnbContext, input: z.infer<typeof ShiftCloseInput>) {
  if (!canCash(ctx)) throw new Error("FORBIDDEN");
  const summary = await currentShiftSummary(ctx);
  if (!summary.shift) throw new Error("NO_SHIFT");
  return inBusiness(ctx, async (tx) => {
    await tx.execute(sql`
      UPDATE fnb.cash_shifts SET closed_by = ${ctx.userId}::uuid, closed_at = now(),
        closing_cash = ${input.closingCash}, notes = ${input.notes ?? null}
      WHERE id = ${summary.shift!.id}::uuid AND closed_at IS NULL
    `);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.shift.closed", targetType: "cash_shift",
      targetId: summary.shift!.id, meta: { closingCash: input.closingCash, expectedCash: summary.expectedCash, salesTotal: summary.salesTotal },
    });
    return { expectedCash: summary.expectedCash, closingCash: input.closingCash };
  });
}

/** Pembayaran boleh dicicil; pesanan selesai otomatis saat total terbayar penuh. */
export async function payOrder(ctx: FnbContext, input: z.infer<typeof PaymentInput>) {
  if (!canCash(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const orders = (await tx.execute(sql`
      SELECT id, total, status FROM fnb.orders WHERE id = ${input.orderId}::uuid FOR UPDATE
    `)) as unknown as { id: string; total: number; status: string }[];
    const order = orders[0];
    if (!order) throw new Error("NOT_FOUND");
    if (!["ready", "served", "completed"].includes(order.status)) throw new Error("ORDER_NOT_READY");
    const shift = (await tx.execute(sql`SELECT id FROM fnb.cash_shifts WHERE closed_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    const [payment] = (await tx.execute(sql`
      INSERT INTO fnb.payments (business_id, order_id, amount, method, recorded_by, shift_id)
      VALUES (${ctx.businessId}::uuid, ${order.id}::uuid, ${input.amount}, ${input.method}::fnb.payment_method, ${ctx.userId}::uuid, ${shift[0]?.id ?? null}::uuid)
      RETURNING id
    `)) as unknown as { id: string }[];
    const paidRows = (await tx.execute(sql`
      SELECT coalesce(sum(amount), 0) AS paid FROM fnb.payments WHERE order_id = ${order.id}::uuid AND voided_at IS NULL
    `)) as unknown as { paid: string }[];
    const paid = Number(paidRows[0]?.paid ?? 0);
    if (paid >= order.total && order.status !== "completed") {
      await tx.execute(sql`UPDATE fnb.orders SET status = 'completed', completed_at = now() WHERE id = ${order.id}::uuid`);
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payment.recorded", targetType: "payment",
      targetId: payment!.id, meta: { orderId: order.id, amount: input.amount, method: input.method, paid },
    });
    return { id: payment!.id, paid, remaining: Math.max(0, order.total - paid), completed: paid >= order.total };
  });
}

export async function voidPayment(ctx: FnbContext, id: string, input: z.infer<typeof VoidPaymentInput>) {
  if (!can(ctx, "payments.void")) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE fnb.payments SET voided_at = now(), void_reason = ${input.reason}
      WHERE id = ${id}::uuid AND voided_at IS NULL RETURNING order_id AS "orderId", amount
    `)) as unknown as { orderId: string; amount: number }[];
    if (!rows[0]) throw new Error("NOT_FOUND");
    const order = rows[0];
    const paidRows = (await tx.execute(sql`
      SELECT coalesce(sum(amount), 0) AS paid FROM fnb.payments WHERE order_id = ${order.orderId}::uuid AND voided_at IS NULL
    `)) as unknown as { paid: string }[];
    const totals = (await tx.execute(sql`SELECT total FROM fnb.orders WHERE id = ${order.orderId}::uuid`)) as unknown as { total: number }[];
    if (Number(paidRows[0]?.paid ?? 0) < Number(totals[0]?.total ?? 0)) {
      await tx.execute(sql`UPDATE fnb.orders SET status = 'served', completed_at = NULL WHERE id = ${order.orderId}::uuid`);
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payment.voided", targetType: "payment",
      targetId: id, meta: { orderId: order.orderId, amount: order.amount, reason: input.reason },
    });
  });
}

export type PaymentRow = {
  id: string; orderId: string; orderNumber: string; amount: number; method: string;
  recordedAt: string; voidedAt: string | null; voidReason: string | null;
};

export function listRecentPayments(ctx: FnbContext, limit = 30): Promise<PaymentRow[]> {
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT p.id, p.order_id AS "orderId", o.order_number::text AS "orderNumber", p.amount, p.method,
           p.recorded_at AS "recordedAt", p.voided_at AS "voidedAt", p.void_reason AS "voidReason"
    FROM fnb.payments p JOIN fnb.orders o ON o.id = p.order_id
    ORDER BY p.recorded_at DESC LIMIT ${limit}
  `)) as unknown as PaymentRow[]);
}
