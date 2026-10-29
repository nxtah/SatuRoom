import { PublicBookingInput } from "@/lib/schemas";
import { submitPublicBooking } from "@/server/bookings";
import { body, clientIp, ok, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

type Ctx = { params: Promise<{ code: string }> };

/** Permintaan booking dari tamu tanpa akun. Dibatasi per alamat IP. */
export const POST = route(async (req, ctx: Ctx) => {
  rateLimit(`booking:${clientIp(req)}`, 8, 60 * 60_000);
  const { code } = await ctx.params;
  const input = await body(req, PublicBookingInput);
  return ok({ status: await submitPublicBooking(code, input) }, 201);
});
