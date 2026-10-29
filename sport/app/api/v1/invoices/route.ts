import { academyContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { monthSummary } from "@/server/fees";
import { ok, route } from "@/server/http";

export const GET = route(async (req) => {
  const month = req.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AppError(422, "invalid", "Bulan tidak valid.");
  return ok(await monthSummary(await academyContext(), month));
});
