import { NextResponse } from "next/server";
import { RefundInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { refundPayment } from "@/server/payments";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => NextResponse.json(await refundPayment(ctx, id, await body(req, RefundInput)), { status: 201 }));
