import { ShiftsInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { setShifts } from "@/server/staff-attendance";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  await setShifts(await academyContext(), await routeId(ctx, "Staf"), await body(req, ShiftsInput));
  return noContent();
});
