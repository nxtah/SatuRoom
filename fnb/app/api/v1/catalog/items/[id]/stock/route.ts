import { NextResponse } from "next/server";
import { ItemStockInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { adjustItemStock } from "@/server/item-stock";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  await adjustItemStock(ctx, id, await body(req, ItemStockInput));
  return NextResponse.json({ ok: true });
});
