import { NextResponse } from "next/server";
import { ItemStockInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { adjustItemStock } from "@/server/item-stock";

export const POST = route<{ id: string; itemId: string }>(async (req, ctx, { id, itemId }) => { await adjustItemStock(ctx, itemId, await body(req, ItemStockInput), id); return NextResponse.json({ ok: true }); });
