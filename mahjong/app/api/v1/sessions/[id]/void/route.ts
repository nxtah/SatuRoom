import { venueContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { voidSession } from "@/server/sessions";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req, ctx: Ctx) => {
  await voidSession(await venueContext(), await routeId(ctx, "Sesi"));
  return noContent();
});
