import { verifyEmail } from "@saturoom/core/auth";
import { TokenInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const { token } = await body(req, TokenInput);
  if (!(await verifyEmail(db(), token))) {
    throw new AppError(410, "link_expired", "Link sudah dipakai atau kedaluwarsa. Minta link baru dari halaman masuk.");
  }
  return ok({ status: "verified" });
});
