import { findUserIdByEmail, issueToken, normalizeEmail } from "@saturoom/core/auth";
import { NextResponse } from "next/server";
import { EmailInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { body, limited, publicRoute } from "@/server/http";
import { sendResetPassword } from "@/server/mail";
import { clientIp } from "@/server/rate-limit";

export const POST = publicRoute(async (req) => {
  const { email } = await body(req, EmailInput);
  limited(`forgot:${clientIp(req)}`, 10, 60 * 60_000);
  limited(`forgot:${normalizeEmail(email)}`, 3, 60 * 60_000);
  const userId = await findUserIdByEmail(db(), email);
  if (userId) await sendResetPassword(email, await issueToken(db(), userId, "reset_password")).catch((e: unknown) => console.error("gagal kirim reset", e instanceof Error ? e.message : e));
  return NextResponse.json({ status: "check_email" }, { status: 202 });
});
