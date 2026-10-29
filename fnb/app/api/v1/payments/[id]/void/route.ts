import { NextResponse } from "next/server";
import { VoidPaymentInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { voidPayment } from "@/server/payments";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => {
  await voidPayment(ctx, id, await body(req, VoidPaymentInput));
  return new NextResponse(null, { status: 204 });
});
