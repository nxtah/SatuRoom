import { NextResponse } from "next/server";
import { OrderTypeInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { listOrderTypes, saveOrderType } from "@/server/order-types";

export const GET = route(async (_req, ctx) => NextResponse.json(await listOrderTypes(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await saveOrderType(ctx, await body(req, OrderTypeInput)), { status: 201 }));
