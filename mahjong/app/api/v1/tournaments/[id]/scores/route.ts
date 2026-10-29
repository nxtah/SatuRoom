import { ScoresInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { saveScores } from "@/server/tournaments";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  await saveScores(await venueContext(), await routeId(ctx, "Turnamen"), await body(req, ScoresInput));
  return noContent();
});
