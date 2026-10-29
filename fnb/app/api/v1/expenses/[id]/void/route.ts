import { NextResponse } from "next/server";
import { ExpenseVoidInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { voidExpense } from "@/server/expenses";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  await voidExpense(ctx, id, await body(req, ExpenseVoidInput));
  return NextResponse.json({ ok: true });
});
