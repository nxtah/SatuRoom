import { findUserIdByEmail, issueToken, normalizeEmail } from "@saturoom/core/auth";
import { users } from "@saturoom/core/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { EmailInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { body, limited, publicRoute } from "@/server/http";
import { sendVerifyEmail } from "@/server/mail";
import { clientIp } from "@/server/rate-limit";

export const POST = publicRoute(async (req) => {
  const { email } = await body(req, EmailInput);
  limited(`resend:${clientIp(req)}`, 10, 60 * 60_000);
  limited(`resend:${normalizeEmail(email)}`, 3, 60 * 60_000);
  const userId = await findUserIdByEmail(db(), email);
  if (userId) {
    const [user] = await db().select({ name: users.name, verified: users.emailVerifiedAt }).from(users).where(eq(users.id, userId));
    if (user && !user.verified) await sendVerifyEmail(email, user.name, await issueToken(db(), userId, "verify_email")).catch((e: unknown) => console.error("gagal kirim verifikasi", e instanceof Error ? e.message : e));
  }
  // Jawaban sama untuk email yang terdaftar maupun tidak, supaya daftar akun tidak bocor.
  return NextResponse.json({ status: "check_email" }, { status: 202 });
});
