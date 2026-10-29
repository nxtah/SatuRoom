import { TopUpInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { topUp } from "@/server/members";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => {
  await topUp(await venueContext(), await routeId(ctx, "Member"), await body(req, TopUpInput));
  return noContent();
});
