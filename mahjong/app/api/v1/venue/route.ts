import { SettingsInput, VenueInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { getVenue, updateVenue } from "@/server/venue";

export const GET = route(async () => ok(await getVenue(await venueContext())));

/** Profil dan aturan tarif tempat. */
export const PATCH = route(async (req) => {
  const input = await body(req, VenueInput.and(SettingsInput));
  await updateVenue(await venueContext(), { name: input.name, city: input.city }, input);
  return noContent();
});
