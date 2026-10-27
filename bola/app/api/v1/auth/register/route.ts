import { createSession, registerUser } from "@saturoom/core/auth";
import { RegisterInput } from "@/lib/schemas";
import { PRODUCT } from "@/server/context";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { body, clientIp, ok, route, setSessionCookie } from "@/server/http";
import { sendVerifyEmail } from "@/server/mail";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  const input = await body(req, RegisterInput);
  const result = await registerUser(db(), input);
  if (result.status === "exists") {
    throw new AppError(409, "email_taken", "Email ini sudah terdaftar. Silakan masuk.");
  }
  // Langsung masuk tanpa menunggu konfirmasi. Link konfirmasi tetap dikirim; email yang belum
  // dikonfirmasi belum bisa membuka undangan (lihat isEmailVerified).
  try {
    await sendVerifyEmail(input.email, input.name, result.verifyToken);
  } catch (error) {
    console.error("gagal mengirim email konfirmasi", error);
  }
  await setSessionCookie(await createSession(db(), result.userId, PRODUCT));
  return ok({ status: "ok" }, 201);
});
