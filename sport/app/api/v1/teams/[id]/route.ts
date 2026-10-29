import { TeamInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { notFound } from "@/server/errors";
import { body, noContent, ok, route } from "@/server/http";
import { archiveTeam, getTeam, updateTeam } from "@/server/teams";

type Ctx = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f-]{36}$/i;

async function teamId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!uuid.test(id)) throw notFound("Tim");
  return id;
}

export const GET = route(async (_req, ctx: Ctx) => ok(await getTeam(await academyContext(), await teamId(ctx))));

export const PATCH = route(async (req, ctx: Ctx) => {
  await updateTeam(await academyContext(), await teamId(ctx), await body(req, TeamInput));
  return noContent();
});

/** Mengarsipkan tim (bukan menghapus permanen). */
export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveTeam(await academyContext(), await teamId(ctx));
  return noContent();
});
