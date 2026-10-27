import { login, normalizeEmail } from "@saturoom/core/auth";
import { LoginInput } from "@/lib/schemas";
import { PRODUCT } from "@/server/context";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { body, clientIp, ok, route, setSessionCookie } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  const input = await body(req, LoginInput);
  rateLimit(`login:${clientIp(req)}`, 30, 15 * 60_000);
  rateLimit(`login:${normalizeEmail(input.email)}`, 8, 15 * 60_000);
  const result = await login(db(), { ...input, product: PRODUCT });
  if (result.status === "invalid") {
    throw new AppError(401, "invalid_credentials", "Email atau password salah.");
  }
  await setSessionCookie(result.token);
  return ok({ status: "ok" });
});
