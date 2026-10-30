import { NextResponse } from "next/server";
import { CategoryUpdateInput } from "@/lib/schemas";
import { archiveCategory, updateCategory } from "@/server/catalog";
import { body, route } from "@/server/http";

type P = { id: string };
export const PUT = route<P>(async (req, ctx, { id }) => {
  await updateCategory(ctx, id, await body(req, CategoryUpdateInput));
  return NextResponse.json({ ok: true });
});
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await archiveCategory(ctx, id);
  return NextResponse.json({ ok: true });
});
