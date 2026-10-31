import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { SupplierInput, createSupplier } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createSupplier(ctx, await body(req, SupplierInput)) }, 201);
});
