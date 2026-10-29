import { LocationInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createLocation, listLocations } from "@/server/locations";

export const GET = route(async () => ok({ locations: await listLocations(await academyContext()) }));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createLocation(ctx, await body(req, LocationInput)) }, 201);
});
