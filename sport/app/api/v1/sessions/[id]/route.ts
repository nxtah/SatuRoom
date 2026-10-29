import { getSessionSheet } from "@/server/attendance";
import { academyContext } from "@/server/context";
import { ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

/** Detail sesi beserta lembar absensinya. */
export const GET = route(async (_req, ctx: Ctx) =>
  ok(await getSessionSheet(await academyContext(), await routeId(ctx, "Sesi"))),
);
