import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { ExpenseInput, ExpenseVoidInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type Expense = {
  id: string; spentOn: string; category: string; amount: number; note: string | null;
  fromDrawer: boolean; voidedAt: string | null; voidReason: string | null;
};

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "expenses.manage")) throw forbidden(); };

export function listExpenses(ctx: FnbContext, month?: string): Promise<Expense[]> {
  need(ctx);
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT id, to_char(spent_on, 'YYYY-MM-DD') AS "spentOn", category, amount, note, (cash_movement_id IS NOT NULL) AS "fromDrawer",
           voided_at AS "voidedAt", void_reason AS "voidReason"
    FROM fnb.expenses
    WHERE ${month ? sql`to_char(spent_on, 'YYYY-MM') = ${month}` : sql`spent_on >= (now() AT TIME ZONE 'Asia/Jakarta')::date - 30`}
    ORDER BY spent_on DESC, created_at DESC LIMIT 200`)) as unknown as Expense[]);
}

/** Bila dibayar dari laci, pengeluaran otomatis menjadi kas keluar di shift berjalan sehingga selisih laci tetap benar. */
export async function createExpense(ctx: FnbContext, input: z.infer<typeof ExpenseInput>) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    let movementId: string | null = null;
    if (input.fromDrawer) {
      const [shift] = (await tx.execute(sql`SELECT id FROM fnb.cash_shifts WHERE closed_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
      if (!shift) throw new AppError(409, "shift_required", "Buka shift kas dulu untuk membayar dari laci.");
      const [m] = (await tx.execute(sql`
        INSERT INTO fnb.cash_movements (business_id, shift_id, kind, amount, category, reason, recorded_by)
        VALUES (${ctx.businessId}::uuid, ${shift.id}::uuid, 'out', ${input.amount}, ${input.category}, ${input.note?.length ? input.note : `Pengeluaran ${input.category}`}, ${ctx.userId}::uuid) RETURNING id`)) as unknown as { id: string }[];
      movementId = m!.id;
    }
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.expenses (business_id, spent_on, category, amount, note, cash_movement_id, recorded_by)
      VALUES (${ctx.businessId}::uuid, ${input.spentOn ?? sql`(now() AT TIME ZONE 'Asia/Jakarta')::date`}, ${input.category}, ${input.amount}, ${input.note ?? null}, ${movementId}::uuid, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.expense.created", targetType: "expense", targetId: row!.id, meta: { amount: input.amount, category: input.category, fromDrawer: input.fromDrawer } });
    return { id: row!.id };
  });
}

/** Pengeluaran tidak dihapus: ditandai batal dengan alasan. Kas keluar terkait ikut dibalik lewat kas masuk di shift berjalan. */
export async function voidExpense(ctx: FnbContext, id: string, input: z.infer<typeof ExpenseVoidInput>) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    const [e] = (await tx.execute(sql`SELECT id, amount, category, cash_movement_id AS "movementId", voided_at AS "voidedAt" FROM fnb.expenses WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { id: string; amount: number; category: string; movementId: string | null; voidedAt: string | null }[];
    if (!e) throw notFound("Pengeluaran");
    if (e.voidedAt) throw new AppError(409, "already_voided", "Pengeluaran ini sudah dibatalkan.");
    if (e.movementId) {
      const [shift] = (await tx.execute(sql`SELECT id FROM fnb.cash_shifts WHERE closed_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
      if (!shift) throw new AppError(409, "shift_required", "Buka shift kas dulu. Uang yang dikembalikan ke laci dicatat di shift berjalan.");
      await tx.execute(sql`
        INSERT INTO fnb.cash_movements (business_id, shift_id, kind, amount, category, reason, recorded_by)
        VALUES (${ctx.businessId}::uuid, ${shift.id}::uuid, 'in', ${e.amount}, ${e.category}, ${`Pengeluaran dibatalkan: ${input.reason}`}, ${ctx.userId}::uuid)`);
    }
    await tx.execute(sql`UPDATE fnb.expenses SET voided_at = now(), void_reason = ${input.reason} WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.expense.voided", targetType: "expense", targetId: id, meta: { reason: input.reason } });
  });
}
