import { venueContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { revokeInvitation } from "@/server/staff";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req, ctx: Ctx) => {
  await revokeInvitation(await venueContext(), await routeId(ctx, "Undangan"));
  return noContent();
});
