import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { OrderInput, placeOrder } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await placeOrder(ctx, await body(req, OrderInput)) }, 201);
});
