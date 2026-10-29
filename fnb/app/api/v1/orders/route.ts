import { NextResponse } from "next/server";
import { OrderInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { createOrder, listOrders } from "@/server/orders";

export const GET = route(async (req, ctx) => NextResponse.json(await listOrders(ctx, new URL(req.url).searchParams.get("scope") === "all" ? "all" : "active")));
export const POST = route(async (req, ctx) => NextResponse.json(await createOrder(ctx, await body(req, OrderInput)), { status: 201 }));
