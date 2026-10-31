import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { CountInput, stockCount } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok(await stockCount(ctx, await body(req, CountInput)));
});
