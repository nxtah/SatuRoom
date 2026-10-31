import { ExpenseInput } from "@/lib/schemas";
import { createExpense } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createExpense(ctx, await body(req, ExpenseInput)) }, 201);
});
