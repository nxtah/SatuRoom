import { resetPassword } from "@saturoom/core/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ResetInput } from "@/lib/schemas";
import { cookieName } from "@/server/context";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { body, publicRoute } from "@/server/http";

export const POST = publicRoute(async (req) => {
  const { token, password } = await body(req, ResetInput);
  if (!(await resetPassword(db(), token, password))) throw new AppError(410, "link_expired", "Link sudah dipakai atau kedaluwarsa. Minta link baru.");
  (await cookies()).delete(cookieName());
  return NextResponse.json({ status: "password_changed" });
});
