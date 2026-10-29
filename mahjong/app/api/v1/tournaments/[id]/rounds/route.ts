import { venueContext } from "@/server/context";
import { ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { generateRound } from "@/server/tournaments";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req, ctx: Ctx) => ok({ round: await generateRound(await venueContext(), await routeId(ctx, "Turnamen")) }, 201));
