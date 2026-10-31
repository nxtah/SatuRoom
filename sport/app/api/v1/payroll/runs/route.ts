import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { prepareRun } from "@/server/payroll";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  const { month } = await body(req, z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }));
  return ok({ id: await prepareRun(ctx, month) }, 201);
});
