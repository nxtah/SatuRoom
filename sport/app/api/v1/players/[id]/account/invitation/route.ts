import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { revokePlayerInvitation } from "@/server/player-account";

type Ctx = { params: Promise<{ id: string }> };

const uuidOr = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

export const DELETE = route(async (req, ctx: Ctx) => {
  await revokePlayerInvitation(await academyContext(), await routeId(ctx, "Pemain"), uuidOr(new URL(req.url).searchParams.get("id")));
  return noContent();
});
