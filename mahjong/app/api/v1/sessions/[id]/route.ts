import { SessionPatchInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { getSession, patchSession } from "@/server/sessions";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, ctx: Ctx) => ok(await getSession(await venueContext(), await routeId(ctx, "Sesi"))));

export const PATCH = route(async (req, ctx: Ctx) => {
  await patchSession(await venueContext(), await routeId(ctx, "Sesi"), await body(req, SessionPatchInput));
  return noContent();
});
