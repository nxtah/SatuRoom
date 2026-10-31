import { PlayerInviteInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { invitePlayerAccount, playerAccount, unlinkPlayerAccount } from "@/server/player-account";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, ctx: Ctx) =>
  ok(await playerAccount(await academyContext(), await routeId(ctx, "Pemain"))),
);

/** Mengundang email untuk menjadi akun pemain ini. */
export const POST = route(async (req, ctx: Ctx) => {
  const { email, relation } = await body(req, PlayerInviteInput);
  await invitePlayerAccount(await academyContext(), await routeId(ctx, "Pemain"), email, relation);
  return noContent();
});

/** Memutus akun dari pemain. Akun penggunanya tetap ada. */
const uuidOr = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : undefined);

export const DELETE = route(async (req, ctx: Ctx) => {
  await unlinkPlayerAccount(await academyContext(), await routeId(ctx, "Pemain"), uuidOr(new URL(req.url).searchParams.get("user")));
  return noContent();
});
