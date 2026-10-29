import { CloseSessionInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { closeSession } from "@/server/sessions";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => ok(await closeSession(await venueContext(), await routeId(ctx, "Sesi"), await body(req, CloseSessionInput))));
