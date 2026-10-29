import { SwitchInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { switchVenue } from "@/server/venue";

export const POST = route(async (req) => {
  const session = await requireSession();
  await switchVenue(session, (await body(req, SwitchInput)).venueId);
  return noContent();
});
