import { venueContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { finishTournament } from "@/server/tournaments";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req, ctx: Ctx) => {
  await finishTournament(await venueContext(), await routeId(ctx, "Turnamen"));
  return noContent();
});
