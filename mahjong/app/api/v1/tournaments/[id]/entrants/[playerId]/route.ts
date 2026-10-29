import { EntrantPatchInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { body, noContent, route } from "@/server/http";
import { isUuid } from "@/server/ids";
import { removeEntrant, setEntrantPaid } from "@/server/tournaments";

type Ctx = { params: Promise<{ id: string; playerId: string }> };

async function ids(ctx: Ctx) {
  const { id, playerId } = await ctx.params;
  if (!isUuid(id) || !isUuid(playerId)) throw new AppError(404, "not_found", "Peserta tidak ditemukan.");
  return { id, playerId };
}

export const PATCH = route(async (req, ctx: Ctx) => {
  const { id, playerId } = await ids(ctx);
  await setEntrantPaid(await venueContext(), id, playerId, (await body(req, EntrantPatchInput)).paid);
  return noContent();
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  const { id, playerId } = await ids(ctx);
  await removeEntrant(await venueContext(), id, playerId);
  return noContent();
});
