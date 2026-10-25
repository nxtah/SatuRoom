import { PlayerInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { notFound } from "@/server/errors";
import { body, noContent, ok, route } from "@/server/http";
import { getPlayer, updatePlayer } from "@/server/players";

type Ctx = { params: Promise<{ id: string }> };

async function playerId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Pemain");
  return id;
}

export const GET = route(async (_req, ctx: Ctx) => ok(await getPlayer(await academyContext(), await playerId(ctx))));

export const PATCH = route(async (req, ctx: Ctx) => {
  await updatePlayer(await academyContext(), await playerId(ctx), await body(req, PlayerInput));
  return noContent();
});
