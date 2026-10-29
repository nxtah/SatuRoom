import { EntrantInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { addEntrant } from "@/server/tournaments";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => {
  await addEntrant(await venueContext(), await routeId(ctx, "Turnamen"), await body(req, EntrantInput));
  return noContent();
});
