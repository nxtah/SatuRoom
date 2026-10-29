import { findUserIdByEmail, issueToken, normalizeEmail } from "@saturoom/core/auth";
import { users } from "@saturoom/core/schema";
import { eq } from "drizzle-orm";
import { EmailInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { body, clientIp, ok, route } from "@/server/http";
import { sendVerifyEmail } from "@/server/mail";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  const { email } = await body(req, EmailInput);
  rateLimit(`resend:${clientIp(req)}`, 10, 60 * 60_000);
  rateLimit(`resend:${normalizeEmail(email)}`, 3, 60 * 60_000);
  const userId = await findUserIdByEmail(db(), email);
  if (userId) {
    const [user] = await db()
      .select({ name: users.name, verified: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, userId));
    if (user && !user.verified) await sendVerifyEmail(email, user.name, await issueToken(db(), userId, "verify_email"));
  }
  return ok({ status: "check_email" }, 202);
});
