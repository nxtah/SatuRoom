import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { setSessionCancelled } from "@/server/schedule";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (_req, ctx: Ctx) => {
  await setSessionCancelled(await academyContext(), await routeId(ctx, "Sesi"), false);
  return noContent();
});
