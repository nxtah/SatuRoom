import { registerUser } from "@saturoom/core/auth";
import { RegisterInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { body, clientIp, ok, route } from "@/server/http";
import { sendVerifyEmail } from "@/server/mail";
import { rateLimit } from "@/server/rate-limit";

export const POST = route(async (req) => {
  rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000);
  const input = await body(req, RegisterInput);
  const result = await registerUser(db(), input);
  if (result.status === "created") await sendVerifyEmail(input.email, input.name, result.verifyToken);
  // Jawaban sama untuk email baru dan yang sudah terdaftar.
  return ok({ status: "check_email" }, 202);
});
