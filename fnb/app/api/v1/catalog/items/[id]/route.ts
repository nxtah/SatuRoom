import { NextResponse } from "next/server";
import { ItemUpdateInput } from "@/lib/schemas";
import { archiveItem, updateItem } from "@/server/catalog";
import { body, route } from "@/server/http";

type P = { id: string };
export const PUT = route<P>(async (req, ctx, { id }) => {
  await updateItem(ctx, id, await body(req, ItemUpdateInput));
  return NextResponse.json({ ok: true });
});
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await archiveItem(ctx, id);
  return NextResponse.json({ ok: true });
});
