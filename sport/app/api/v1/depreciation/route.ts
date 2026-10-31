import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { runDepreciation } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  const { month } = await body(req, z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }));
  return ok({ total: await runDepreciation(ctx, month) });
});
