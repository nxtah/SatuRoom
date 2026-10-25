import { InvoiceUpdateInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { updateInvoice } from "@/server/fees";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req, ctx: Ctx) => {
  await updateInvoice(await academyContext(), await routeId(ctx, "Tagihan"), await body(req, InvoiceUpdateInput));
  return noContent();
});
