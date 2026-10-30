import { NextResponse } from "next/server";
import { DiscountQuoteInput } from "@/lib/schemas";
import { quoteDiscounts } from "@/server/discounts";
import { body, route } from "@/server/http";

export const POST = route(async (req, ctx) => NextResponse.json(await quoteDiscounts(ctx, await body(req, DiscountQuoteInput))));
