import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { setMonitor } from "@/server/staff-attendance";

export const PUT = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const { on } = await body(req, z.object({ on: z.boolean() }));
  await setMonitor(await academyContext(), await routeId(c, "Staf"), on);
  return noContent();
});
