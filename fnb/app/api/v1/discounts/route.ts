import { NextResponse } from "next/server";
import { DiscountInput } from "@/lib/schemas";
import { listDiscounts, saveDiscount } from "@/server/discounts";
import { body, route } from "@/server/http";

export const GET = route(async (_req, ctx) => NextResponse.json(await listDiscounts(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await saveDiscount(ctx, await body(req, DiscountInput)), { status: 201 }));
