import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { cancelPurchase, payPurchase, receivePurchase } from "@/server/inventory";

export const POST = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Pembelian");
  const b = await body(req, z.object({ action: z.enum(["receive", "pay", "cancel"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), accountId: z.string().uuid().optional() }));
  if (b.action === "receive") await receivePurchase(ctx, id, b.date);
  else if (b.action === "pay") await payPurchase(ctx, id, b.date, b.accountId);
  else await cancelPurchase(ctx, id);
  return noContent();
});
