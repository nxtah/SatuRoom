import { PublicRegistrationInput } from "@/lib/schemas";
import { body, clientIp, noContent, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { submitPublicRegistration } from "@/server/registrations";

/** Tanpa login: dibatasi per alamat dan per link, dan isian jebakan `website` membuang bot diam-diam. */
export const POST = route(async (req, ctx: { params: Promise<{ token: string }> }) => {
  const { token } = await ctx.params;
  rateLimit(`registration:ip:${clientIp(req)}`, 5, 60 * 60_000);
  rateLimit(`registration:token:${token.slice(0, 64)}`, 100, 24 * 60 * 60_000);
  const input = await body(req, PublicRegistrationInput);
  if (input.website) return noContent();
  await submitPublicRegistration(token, input);
  return noContent();
});
