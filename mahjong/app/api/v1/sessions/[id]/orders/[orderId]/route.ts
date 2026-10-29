import { OrderPatchInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { body, noContent, route } from "@/server/http";
import { isUuid } from "@/server/ids";
import { setOrderStatus } from "@/server/sessions";

type Ctx = { params: Promise<{ id: string; orderId: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  const { id, orderId } = await ctx.params;
  if (!isUuid(id) || !isUuid(orderId)) throw new AppError(404, "not_found", "Pesanan tidak ditemukan.");
  await setOrderStatus(await venueContext(), id, orderId, (await body(req, OrderPatchInput)).status);
  return noContent();
});
