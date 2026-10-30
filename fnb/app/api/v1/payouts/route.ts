import { NextResponse } from "next/server";
import { PayoutInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { payoutOverview, requestPayout } from "@/server/payouts";

export const GET = route(async (_req, ctx) => NextResponse.json(await payoutOverview(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await requestPayout(ctx, await body(req, PayoutInput)), { status: 201 }));
