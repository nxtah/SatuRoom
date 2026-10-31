import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { PurchaseInput, createPurchase } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createPurchase(ctx, await body(req, PurchaseInput)) }, 201);
});
