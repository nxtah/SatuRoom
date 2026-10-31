import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { clockIn, clockOut } from "@/server/staff-attendance";

const ClockInput = z.object({ action: z.enum(["in", "out"]) });

export const POST = route(async (req) => {
  const ctx = await academyContext();
  const { action } = await body(req, ClockInput);
  await (action === "in" ? clockIn(ctx) : clockOut(ctx));
  return noContent();
});
