import { findUserIdByEmail, issueToken, normalizeEmail } from "@saturoom/core/auth";
import { EmailInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { body, clientIp, ok, route } from "@/server/http";
import { sendResetPassword } from "@/server/mail";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  const { email } = await body(req, EmailInput);
  rateLimit(`forgot:${clientIp(req)}`, 10, 60 * 60_000);
  rateLimit(`forgot:${normalizeEmail(email)}`, 3, 60 * 60_000);
  const userId = await findUserIdByEmail(db(), email);
  if (userId) await sendResetPassword(email, await issueToken(db(), userId, "reset_password"));
  return ok({ status: "check_email" }, 202);
});
