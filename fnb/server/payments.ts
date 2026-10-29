import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { CashMovementInput, PaymentInput, RefundInput, ShiftCloseInput, ShiftOpenInput, VoidPaymentInput } from "@/lib/schemas";
import { db } from "./db";
import { can, type FnbContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";

export type Shift = {
  id: string; openedAt: string; openingCash: number; closedAt: string | null; closingCash: number | null; notes: string | null;
};
export type ShiftSummary = {
  shift: Shift | null; salesTotal: number; cashTotal: number; nonCashTotal: number; orderCount: number; expectedCash: number;
  cashIn: number; cashOut: number; cashRefunds: number; refundTotal: number;
};
export type CashMovement = { id: string; kind: "in" | "out"; amount: number; category: string; reason: string; recordedAt: string };

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
    if (!shift) return { shift: null, salesTotal: 0, cashTotal: 0, nonCashTotal: 0, orderCount: 0, expectedCash: 0, cashIn: 0, cashOut: 0, cashRefunds: 0, refundTotal: 0 };
    const totals = (await tx.execute(sql`
      SELECT coalesce(sum(p.amount), 0) AS total,
             coalesce(sum(p.amount) FILTER (WHERE p.method = 'cash'), 0) AS cash,
             count(DISTINCT p.order_id) AS orders
      FROM fnb.payments p WHERE p.shift_id = ${shift.id}::uuid AND p.voided_at IS NULL
    `)) as unknown as { total: string; cash: string; orders: string }[];
    const total = Number(totals[0]?.total ?? 0), cash = Number(totals[0]?.cash ?? 0), orders = Number(totals[0]?.orders ?? 0);
    const [moves] = (await tx.execute(sql`
      SELECT coalesce(sum(amount) FILTER (WHERE kind = 'in'), 0) AS "in", coalesce(sum(amount) FILTER (WHERE kind = 'out'), 0) AS "out"
      FROM fnb.cash_movements WHERE shift_id = ${shift.id}::uuid
    `)) as unknown as { in: string; out: string }[];
    const [refunds] = (await tx.execute(sql`
      SELECT coalesce(sum(amount), 0) AS total, coalesce(sum(amount) FILTER (WHERE method = 'cash'), 0) AS cash
      FROM fnb.refunds WHERE shift_id = ${shift.id}::uuid
    `)) as unknown as { total: string; cash: string }[];
    const cashIn = Number(moves?.in ?? 0), cashOut = Number(moves?.out ?? 0), cashRefunds = Number(refunds?.cash ?? 0), refundTotal = Number(refunds?.total ?? 0);
    // Uang di laci = kas awal + penjualan tunai + kas masuk - kas keluar - refund tunai. QRIS dan transfer tidak masuk laci.
    return {
      shift, salesTotal: total - refundTotal, cashTotal: cash, nonCashTotal: total - cash, orderCount: orders,
      expectedCash: shift.openingCash + cash + cashIn - cashOut - cashRefunds, cashIn, cashOut, cashRefunds, refundTotal,
    };
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
        closing_cash = ${input.closingCash}, notes = ${input.notes ?? null},
        expected_cash = ${summary.expectedCash}, variance = ${input.closingCash - summary.expectedCash}
      WHERE id = ${summary.shift!.id}::uuid AND closed_at IS NULL
    `);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.shift.closed", targetType: "cash_shift",
      targetId: summary.shift!.id, meta: { closingCash: input.closingCash, expectedCash: summary.expectedCash, variance: input.closingCash - summary.expectedCash, salesTotal: summary.salesTotal },
    });
    return { expectedCash: summary.expectedCash, closingCash: input.closingCash, variance: input.closingCash - summary.expectedCash };
  });
}

/**
 * Pembayaran boleh dicicil dan dibagi beberapa metode; pesanan selesai otomatis saat lunas.
 * Nominal tidak boleh melebihi sisa tagihan. Untuk tunai, uang yang diterima dicatat dan kembalian dihitung.
 */
export async function payOrder(ctx: FnbContext, input: z.infer<typeof PaymentInput>) {
  if (!canCash(ctx)) throw new Error("FORBIDDEN");
  if (input.tendered !== undefined && input.method !== "cash") throw new AppError(422, "tender_invalid", "Uang diterima hanya untuk pembayaran tunai.");
  if (input.tendered !== undefined && input.tendered < input.amount) throw new AppError(422, "tender_short", "Uang diterima kurang dari nominal bayar.");
  return inBusiness(ctx, async (tx) => {
    const orders = (await tx.execute(sql`
      SELECT id, total, status FROM fnb.orders WHERE id = ${input.orderId}::uuid FOR UPDATE
    `)) as unknown as { id: string; total: number; status: string }[];
    const order = orders[0];
    if (!order) throw new Error("NOT_FOUND");
    const result = async (paymentId: string) => {
      const [row] = (await tx.execute(sql`
        SELECT coalesce(sum(amount), 0) AS paid FROM fnb.payments WHERE order_id = ${order.id}::uuid AND voided_at IS NULL
      `)) as unknown as { paid: string }[];
      const paid = Number(row?.paid ?? 0);
      const [p] = (await tx.execute(sql`SELECT amount, tendered FROM fnb.payments WHERE id = ${paymentId}::uuid`)) as unknown as { amount: number; tendered: number | null }[];
      return { id: paymentId, paid, remaining: Math.max(0, order.total - paid), completed: paid >= order.total, change: p!.tendered === null ? 0 : p!.tendered - p!.amount };
    };
    if (input.idempotencyKey) {
      const [dup] = (await tx.execute(sql`SELECT id FROM fnb.payments WHERE idempotency_key = ${input.idempotencyKey} AND order_id = ${order.id}::uuid`)) as unknown as { id: string }[];
      if (dup) return result(dup.id);
    }
    if (!["ready", "served", "completed"].includes(order.status)) throw new Error("ORDER_NOT_READY");
    const shift = (await tx.execute(sql`SELECT id FROM fnb.cash_shifts WHERE closed_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    if (!shift[0]) throw new AppError(409, "shift_required", "Buka shift kas dulu sebelum menerima pembayaran.");
    const [before] = (await tx.execute(sql`
      SELECT coalesce(sum(amount), 0) AS paid FROM fnb.payments WHERE order_id = ${order.id}::uuid AND voided_at IS NULL
    `)) as unknown as { paid: string }[];
    const remaining = order.total - Number(before?.paid ?? 0);
    if (remaining <= 0) throw new AppError(409, "already_paid", "Pesanan ini sudah lunas.");
    if (input.amount > remaining) throw new AppError(422, "overpay", `Nominal melebihi sisa tagihan (Rp${remaining.toLocaleString("id-ID")}).`);
    const [payment] = (await tx.execute(sql`
      INSERT INTO fnb.payments (business_id, order_id, amount, method, recorded_by, shift_id, tendered, idempotency_key)
      VALUES (${ctx.businessId}::uuid, ${order.id}::uuid, ${input.amount}, ${input.method}::fnb.payment_method, ${ctx.userId}::uuid, ${shift[0].id}::uuid,
              ${input.tendered ?? null}, ${input.idempotencyKey ?? null})
      RETURNING id
    `)) as unknown as { id: string }[];
    const out = await result(payment!.id);
    if (out.completed && order.status !== "completed") {
      await tx.execute(sql`UPDATE fnb.orders SET status = 'completed', completed_at = now() WHERE id = ${order.id}::uuid`);
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payment.recorded", targetType: "payment",
      targetId: payment!.id, meta: { orderId: order.id, amount: input.amount, method: input.method, paid: out.paid },
    });
    return out;
  });
}

export async function voidPayment(ctx: FnbContext, id: string, input: z.infer<typeof VoidPaymentInput>) {
  if (!can(ctx, "payments.void")) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const [refunded] = (await tx.execute(sql`SELECT count(*)::int AS n FROM fnb.refunds WHERE payment_id = ${id}::uuid`)) as unknown as { n: number }[];
    if (refunded!.n) throw new AppError(409, "has_refunds", "Pembayaran ini sudah pernah di-refund, jadi tidak bisa dibatalkan.");
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
  recordedAt: string; voidedAt: string | null; voidReason: string | null; refunded: number;
};

export function listRecentPayments(ctx: FnbContext, limit = 30): Promise<PaymentRow[]> {
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT p.id, p.order_id AS "orderId", o.receipt_no AS "orderNumber", p.amount, p.method,
           p.recorded_at AS "recordedAt", p.voided_at AS "voidedAt", p.void_reason AS "voidReason",
           (SELECT coalesce(sum(r.amount), 0)::int FROM fnb.refunds r WHERE r.payment_id = p.id) AS refunded
    FROM fnb.payments p JOIN fnb.orders o ON o.id = p.order_id
    ORDER BY p.recorded_at DESC LIMIT ${limit}
  `)) as unknown as PaymentRow[]);
}

/** Kas masuk atau keluar di luar penjualan (tambah modal laci, beli es batu, setor ke bank). */
export async function addCashMovement(ctx: FnbContext, input: z.infer<typeof CashMovementInput>) {
  if (!canCash(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const [shift] = (await tx.execute(sql`SELECT id FROM fnb.cash_shifts WHERE closed_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    if (!shift) throw new AppError(409, "shift_required", "Buka shift kas dulu.");
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.cash_movements (business_id, shift_id, kind, amount, category, reason, recorded_by)
      VALUES (${ctx.businessId}::uuid, ${shift.id}::uuid, ${input.kind}, ${input.amount}, ${input.category}, ${input.reason}, ${ctx.userId}::uuid) RETURNING id
    `)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.cash_movement.recorded", targetType: "cash_movement",
      targetId: row!.id, meta: { ...input },
    });
    return { id: row!.id };
  });
}

export function listCashMovements(ctx: FnbContext): Promise<CashMovement[]> {
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT m.id, m.kind, m.amount, m.category, m.reason, m.recorded_at AS "recordedAt"
    FROM fnb.cash_movements m JOIN fnb.cash_shifts s ON s.id = m.shift_id WHERE s.closed_at IS NULL ORDER BY m.recorded_at DESC
  `)) as unknown as CashMovement[]);
}

/**
 * Refund mengembalikan uang pelanggan tanpa menghapus penjualan. Dicatat terhadap pembayaran asal,
 * memotong penjualan bersih, dan (untuk tunai) mengurangi uang yang seharusnya ada di laci.
 * Stok tidak otomatis kembali karena makanan yang sudah dibuat tidak bisa dijual lagi.
 */
export async function refundPayment(ctx: FnbContext, paymentId: string, input: z.infer<typeof RefundInput>) {
  if (!can(ctx, "orders.refund")) throw forbidden();
  return inBusiness(ctx, async (tx) => {
    const [payment] = (await tx.execute(sql`
      SELECT id, order_id AS "orderId", amount, method::text AS method, voided_at AS "voidedAt" FROM fnb.payments WHERE id = ${paymentId}::uuid FOR UPDATE
    `)) as unknown as { id: string; orderId: string; amount: number; method: string; voidedAt: string | null }[];
    if (!payment) throw notFound("Pembayaran");
    if (payment.voidedAt) throw new AppError(409, "voided", "Pembayaran ini sudah dibatalkan.");
    const [shift] = (await tx.execute(sql`SELECT id FROM fnb.cash_shifts WHERE closed_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
    if (!shift) throw new AppError(409, "shift_required", "Buka shift kas dulu sebelum refund.");
    const [done] = (await tx.execute(sql`SELECT coalesce(sum(amount), 0) AS total FROM fnb.refunds WHERE payment_id = ${paymentId}::uuid`)) as unknown as { total: string }[];
    const left = payment.amount - Number(done?.total ?? 0);
    if (input.amount > left) throw new AppError(422, "refund_exceeds", `Refund melebihi sisa pembayaran (Rp${left.toLocaleString("id-ID")}).`);
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.refunds (business_id, order_id, payment_id, amount, method, reason, refunded_by, shift_id)
      VALUES (${ctx.businessId}::uuid, ${payment.orderId}::uuid, ${paymentId}::uuid, ${input.amount}, ${payment.method}::fnb.payment_method, ${input.reason}, ${ctx.userId}::uuid, ${shift.id}::uuid)
      RETURNING id
    `)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payment.refunded", targetType: "refund",
      targetId: row!.id, meta: { paymentId, orderId: payment.orderId, amount: input.amount, method: payment.method, reason: input.reason },
    });
    return { id: row!.id, remaining: left - input.amount };
  });
}
