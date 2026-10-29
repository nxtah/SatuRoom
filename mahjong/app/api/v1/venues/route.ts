import { VenueInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { body, clientIp, ok, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { createVenue, listMyVenues } from "@/server/venue";

export const GET = route(async () => ok({ venues: await listMyVenues((await requireSession()).userId) }));

export const POST = route(async (req) => {
  const session = await requireSession();
  rateLimit(`venue-create:${session.userId}:${clientIp(req)}`, 5, 60 * 60_000);
  return ok({ id: await createVenue(session, await body(req, VenueInput)) }, 201);
});
