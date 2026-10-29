import { BookingInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { createBooking } from "@/server/bookings";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => ok({ id: await createBooking(await venueContext(), await body(req, BookingInput)) }, 201));
