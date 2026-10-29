import { PlayerInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createPlayer, listPlayers } from "@/server/players";

export const GET = route(async (req) => {
  const p = req.nextUrl.searchParams;
  const status = p.get("status") === "inactive" ? "inactive" : "active";
  const teamId = p.get("team") ?? undefined;
  return ok({
    players: await listPlayers(await academyContext(), {
      q: p.get("q")?.slice(0, 100) ?? undefined,
      status,
      teamId: teamId && /^[0-9a-f-]{36}$/i.test(teamId) ? teamId : undefined,
    }),
  });
});

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createPlayer(ctx, await body(req, PlayerInput)) }, 201);
});
