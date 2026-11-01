import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { clockIn, clockOut } from "@/server/staff-attendance";

const ClockInput = z.object({
  action: z.enum(["in", "out"]),
  photoUrl: z.string().trim().max(500).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  accuracy: z.number().min(0).max(100000).nullable().optional(),
});

export const POST = route(async (req) => {
  const ctx = await academyContext();
  const { action, ...proof } = await body(req, ClockInput);
  await (action === "in" ? clockIn(ctx, proof) : clockOut(ctx, proof));
  return noContent();
});
