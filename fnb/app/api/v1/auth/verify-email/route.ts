import { verifyEmail } from "@saturoom/core/auth";
import { NextResponse } from "next/server";
import { TokenInput } from "@/lib/schemas";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { body, publicRoute } from "@/server/http";

export const POST = publicRoute(async (req) => {
  const { token } = await body(req, TokenInput);
  if (!(await verifyEmail(db(), token))) throw new AppError(410, "link_expired", "Link sudah dipakai atau kedaluwarsa. Minta link baru dari halaman masuk.");
  return NextResponse.json({ status: "verified" });
});
