import { NextResponse } from "next/server";
import { DiscountInput } from "@/lib/schemas";
import { archiveDiscount, saveDiscount } from "@/server/discounts";
import { body, route } from "@/server/http";

type P = { id: string };
export const PUT = route<P>(async (req, ctx, { id }) => NextResponse.json(await saveDiscount(ctx, await body(req, DiscountInput), id)));
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await archiveDiscount(ctx, id);
  return NextResponse.json({ ok: true });
});
