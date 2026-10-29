import { CancelInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { setSessionCancelled } from "@/server/schedule";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req, ctx: Ctx) => {
  await setSessionCancelled(await academyContext(), await routeId(ctx, "Sesi"), true, await body(req, CancelInput));
  return noContent();
});
