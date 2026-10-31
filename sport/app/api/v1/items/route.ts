import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { ItemInput, saveItem } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await saveItem(ctx, null, await body(req, ItemInput)) }, 201);
});
