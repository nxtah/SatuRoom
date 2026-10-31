import { voidExpense } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await voidExpense(await academyContext(), await routeId(ctx, "Pengeluaran"));
  return noContent();
});
