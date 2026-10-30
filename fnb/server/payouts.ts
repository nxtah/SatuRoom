import "server-only";
import { withContext, type Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { PayoutAccountInput, PayoutCancelInput, PayoutInput, PayoutPaidInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type PayoutAccount = { id: string; bankName: string; accountName: string; accountNo: string };
export type Payout = { id: string; bankName: string; accountName: string; accountNo: string; amount: number; fee: number; status: "diajukan" | "dicairkan" | "dibatalkan"; note: string | null; reference: string | null; cancelReason: string | null; requestedAt: string; requestedBy: string | null; paidAt: string | null; paidBy: string | null };
export type PayoutBalance = { byMethod: { method: string; received: number; refunded: number; net: number }[]; netNonCash: number; committed: number; paidOut: number; pending: number; available: number };

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "payouts.manage")) throw forbidden(); };
/** Nomor rekening disamarkan di daftar; yang tampil hanya empat angka terakhir. */
export const maskAccount = (no: string) => `${"•".repeat(Math.max(0, no.length - 4))}${no.slice(-4)}`;

/** Saldo = uang non-tunai yang diterima dikurangi refund non-tunai, lalu dikurangi penarikan yang diajukan atau sudah cair. */
async function balance(tx: Tx): Promise<PayoutBalance> {
  const paid = (await tx.execute(sql`SELECT method::text AS method, coalesce(sum(amount), 0)::int AS amount FROM fnb.payments WHERE voided_at IS NULL AND method <> 'cash' GROUP BY 1`)) as unknown as { method: string; amount: number }[];
  const refunded = (await tx.execute(sql`SELECT method::text AS method, coalesce(sum(amount), 0)::int AS amount FROM fnb.refunds WHERE method <> 'cash' GROUP BY 1`)) as unknown as { method: string; amount: number }[];
  const [out] = (await tx.execute(sql`SELECT coalesce(sum(amount) FILTER (WHERE status = 'dicairkan'), 0)::int AS paid, coalesce(sum(amount) FILTER (WHERE status = 'diajukan'), 0)::int AS pending FROM fnb.payouts`)) as unknown as { paid: number; pending: number }[];
  const methods = [...new Set([...paid.map((p) => p.method), ...refunded.map((r) => r.method)])];
  const byMethod = methods.map((m) => { const received = paid.find((p) => p.method === m)?.amount ?? 0; const ref = refunded.find((r) => r.method === m)?.amount ?? 0; return { method: m, received, refunded: ref, net: received - ref }; });
  const netNonCash = byMethod.reduce((s, m) => s + m.net, 0);
  const committed = out!.paid + out!.pending;
  return { byMethod, netNonCash, committed, paidOut: out!.paid, pending: out!.pending, available: netNonCash - committed };
}

export async function payoutOverview(ctx: FnbContext) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    const accounts = (await tx.execute(sql`SELECT id, bank_name AS "bankName", account_name AS "accountName", account_no AS "accountNo" FROM fnb.payout_accounts WHERE archived_at IS NULL ORDER BY bank_name, account_name`)) as unknown as PayoutAccount[];
    const payouts = (await tx.execute(sql`
      SELECT p.id, p.bank_name AS "bankName", p.account_name AS "accountName", p.account_no AS "accountNo", p.amount, p.fee, p.status, p.note, p.reference, p.cancel_reason AS "cancelReason",
             p.requested_at AS "requestedAt", ur.name AS "requestedBy", p.paid_at AS "paidAt", up.name AS "paidBy"
      FROM fnb.payouts p LEFT JOIN core.users ur ON ur.id = p.requested_by LEFT JOIN core.users up ON up.id = p.paid_by ORDER BY p.requested_at DESC LIMIT 100`)) as unknown as Payout[];
    return { balance: await balance(tx), accounts: accounts.map((a) => ({ ...a, accountNo: maskAccount(a.accountNo) })), payouts: payouts.map((p) => ({ ...p, accountNo: maskAccount(p.accountNo) })) };
  });
}

export async function savePayoutAccount(ctx: FnbContext, input: z.infer<typeof PayoutAccountInput>) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    try {
      const [row] = (await tx.execute(sql`INSERT INTO fnb.payout_accounts (business_id, bank_name, account_name, account_no) VALUES (${ctx.businessId}::uuid, ${input.bankName}, ${input.accountName}, ${input.accountNo}) RETURNING id`)) as unknown as { id: string }[];
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payout_account.created", targetType: "payout_account", targetId: row!.id, meta: { bank: input.bankName, last4: input.accountNo.slice(-4) } });
      return { id: row!.id };
    } catch (e) {
      if ((e as { cause?: { code?: string } }).cause?.code === "23505") throw new AppError(409, "duplicate", "Rekening itu sudah terdaftar.");
      throw e;
    }
  });
}

export async function archivePayoutAccount(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const [open] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.payouts WHERE account_id = ${id}::uuid AND status = 'diajukan' LIMIT 1`)) as unknown as unknown[];
    if (open) throw new AppError(409, "account_in_use", "Rekening masih punya penarikan yang belum selesai.");
    const rows = (await tx.execute(sql`UPDATE fnb.payout_accounts SET archived_at = now() WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Rekening");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payout_account.archived", targetType: "payout_account", targetId: id });
  });
}

/** Pengajuan dikunci per bisnis supaya dua pengajuan bersamaan tidak sama-sama lolos dari saldo yang sama. */
export async function requestPayout(ctx: FnbContext, input: z.infer<typeof PayoutInput>) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`payout:${ctx.businessId}`}))`);
    const [acc] = (await tx.execute(sql`SELECT bank_name AS "bankName", account_name AS "accountName", account_no AS "accountNo" FROM fnb.payout_accounts WHERE id = ${input.accountId}::uuid AND archived_at IS NULL`)) as unknown as Omit<PayoutAccount, "id">[];
    if (!acc) throw new AppError(422, "invalid", "Rekening tujuan tidak ditemukan.");
    const b = await balance(tx);
    if (input.amount > b.available) throw new AppError(409, "insufficient_balance", `Saldo tersedia hanya Rp${Math.max(0, b.available).toLocaleString("id-ID")}.`);
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.payouts (business_id, account_id, bank_name, account_name, account_no, amount, note, requested_by)
      VALUES (${ctx.businessId}::uuid, ${input.accountId}::uuid, ${acc.bankName}, ${acc.accountName}, ${acc.accountNo}, ${input.amount}, ${input.note ?? null}, ${ctx.userId}::uuid) RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payout.requested", targetType: "payout", targetId: row!.id, meta: { amount: input.amount, bank: acc.bankName } });
    return { id: row!.id };
  });
}

export async function markPayoutPaid(ctx: FnbContext, id: string, input: z.infer<typeof PayoutPaidInput>) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE fnb.payouts SET status = 'dicairkan', reference = ${input.reference}, fee = ${input.fee}, paid_at = now(), paid_by = ${ctx.userId}::uuid
      WHERE id = ${id}::uuid AND status = 'diajukan' RETURNING id, amount`)) as unknown as { id: string; amount: number }[];
    if (!rows.length) throw new AppError(409, "not_pending", "Penarikan ini sudah selesai atau dibatalkan.");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payout.paid", targetType: "payout", targetId: id, meta: { amount: rows[0]!.amount, reference: input.reference, fee: input.fee } });
  });
}

export async function cancelPayout(ctx: FnbContext, id: string, input: z.infer<typeof PayoutCancelInput>) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE fnb.payouts SET status = 'dibatalkan', cancel_reason = ${input.reason}, cancelled_at = now(), cancelled_by = ${ctx.userId}::uuid
      WHERE id = ${id}::uuid AND status = 'diajukan' RETURNING id, amount`)) as unknown as { id: string; amount: number }[];
    if (!rows.length) throw new AppError(409, "not_pending", "Hanya penarikan yang masih diajukan yang bisa dibatalkan.");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.payout.cancelled", targetType: "payout", targetId: id, meta: { amount: rows[0]!.amount, reason: input.reason } });
  });
}
