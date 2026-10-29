import { resetPassword } from "@saturoom/core/auth";
import { ResetInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { body, clearSessionCookie, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const { token, password } = await body(req, ResetInput);
  if (!(await resetPassword(db(), token, password))) {
    throw new AppError(410, "link_expired", "Link sudah dipakai atau kedaluwarsa. Minta link baru.");
  }
  await clearSessionCookie();
  return ok({ status: "password_changed" });
});
