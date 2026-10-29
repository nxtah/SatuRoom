import { OrderInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { addOrder } from "@/server/sessions";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => {
  await addOrder(await venueContext(), await routeId(ctx, "Sesi"), await body(req, OrderInput));
  return noContent();
});
