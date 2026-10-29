import { LocationInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { archiveLocation, updateLocation } from "@/server/locations";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  await updateLocation(await academyContext(), await routeId(ctx, "Lokasi"), await body(req, LocationInput));
  return noContent();
});

/** Mengarsipkan lokasi (bukan menghapus permanen). */
export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveLocation(await academyContext(), await routeId(ctx, "Lokasi"));
  return noContent();
});
