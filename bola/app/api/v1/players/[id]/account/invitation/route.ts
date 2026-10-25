import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { revokePlayerInvitation } from "@/server/player-account";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req, ctx: Ctx) => {
  await revokePlayerInvitation(await academyContext(), await routeId(ctx, "Pemain"));
  return noContent();
});
