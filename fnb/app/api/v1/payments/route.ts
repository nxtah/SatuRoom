import { NextResponse } from "next/server";
import { PaymentInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { payOrder } from "@/server/payments";

export const POST = route(async (req, ctx) => NextResponse.json(await payOrder(ctx, await body(req, PaymentInput)), { status: 201 }));
