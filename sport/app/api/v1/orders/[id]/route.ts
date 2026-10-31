import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { payOrder, setOrderStatus } from "@/server/inventory";

export const POST = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Pesanan");
  const b = await body(req, z.object({ action: z.enum(["pay", "fulfill", "cancel"]), method: z.enum(["cash", "transfer", "other"]).default("cash"), paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }));
  if (b.action === "pay") await payOrder(ctx, id, b.method, b.paidOn ?? new Date().toISOString().slice(0, 10));
  else await setOrderStatus(ctx, id, b.action === "fulfill" ? "fulfilled" : "cancelled");
  return noContent();
});
