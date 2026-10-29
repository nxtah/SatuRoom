import { BookingPatchInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { assignBooking, setBookingStatus } from "@/server/bookings";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

/** Memberi meja pada permintaan publik, atau membatalkan / menandai tidak datang. */
export const PATCH = route(async (req, ctx: Ctx) => {
  const ctxVenue = await venueContext();
  const id = await routeId(ctx, "Booking");
  const input = await body(req, BookingPatchInput);
  if ("tableId" in input) await assignBooking(ctxVenue, id, input.tableId);
  else await setBookingStatus(ctxVenue, id, input.status);
  return noContent();
});
