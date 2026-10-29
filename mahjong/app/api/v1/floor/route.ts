import { requirePermission, venueContext } from "@/server/context";
import { ok, route } from "@/server/http";
import { floorBoard } from "@/server/tables";

/** Papan lantai langsung; dipanggil berkala oleh layar lantai. */
export const GET = route(async () => {
  const ctx = await venueContext();
  requirePermission(ctx, "floor.view");
  return ok(await floorBoard(ctx));
});
