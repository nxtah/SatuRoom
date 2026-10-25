import { SessionInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { isIsoDate, isUuid } from "@/server/ids";
import { addDays, createSession, listSessions } from "@/server/schedule";
import { AppError } from "@/server/errors";

/** Sesi dalam rentang tanggal lokal, maksimal 42 hari per permintaan. */
export const GET = route(async (req) => {
  const p = req.nextUrl.searchParams;
  const from = p.get("from");
  const to = p.get("to");
  if (!isIsoDate(from) || !isIsoDate(to) || to < from || to > addDays(from, 41)) {
    throw new AppError(422, "invalid", "Rentang tanggal tidak valid.");
  }
  const team = p.get("team");
  return ok({ sessions: await listSessions(await academyContext(), { from, to, teamId: isUuid(team) ? team : undefined }) });
});

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createSession(ctx, await body(req, SessionInput)) }, 201);
});
