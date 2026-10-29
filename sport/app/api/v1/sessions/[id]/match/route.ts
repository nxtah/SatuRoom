import { MatchInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { getMatch, saveMatch } from "@/server/matches";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, ctx: Ctx) => ok(await getMatch(await academyContext(), await routeId(ctx, "Pertandingan"))));

/** Menyimpan lawan, skor, catatan, dan susunan pemain. */
export const PUT = route(async (req, ctx: Ctx) => {
  await saveMatch(await academyContext(), await routeId(ctx, "Pertandingan"), await body(req, MatchInput));
  return noContent();
});
