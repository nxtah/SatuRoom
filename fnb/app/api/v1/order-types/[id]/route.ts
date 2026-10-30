import { NextResponse } from "next/server";
import { OrderTypeInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archiveOrderType, saveOrderType } from "@/server/order-types";

type P = { id: string };
export const PUT = route<P>(async (req, ctx, { id }) => NextResponse.json(await saveOrderType(ctx, await body(req, OrderTypeInput), id)));
export const DELETE = route<P>(async (_req, ctx, { id }) => {
  await archiveOrderType(ctx, id);
  return NextResponse.json({ ok: true });
});
