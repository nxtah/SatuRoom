import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { approveRun, payRun, unapproveRun } from "@/server/payroll";

export const POST = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Gaji");
  const b = await body(req, z.object({ action: z.enum(["approve", "unapprove", "pay"]), paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), accountId: z.string().uuid().optional() }));
  if (b.action === "approve") await approveRun(ctx, id);
  else if (b.action === "unapprove") await unapproveRun(ctx, id);
  else await payRun(ctx, id, b.paidOn ?? new Date().toISOString().slice(0, 10), b.accountId);
  return noContent();
});
