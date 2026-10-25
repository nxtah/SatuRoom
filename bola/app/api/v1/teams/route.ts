import { TeamInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createTeam, listTeams } from "@/server/teams";

export const GET = route(async () => ok({ teams: await listTeams(await academyContext()) }));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createTeam(ctx, await body(req, TeamInput)) }, 201);
});
