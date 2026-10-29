import { NextResponse } from "next/server";
import { ShiftOpenInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { currentShiftSummary, openShift } from "@/server/payments";

export const GET = route(async (_req, ctx) => NextResponse.json(await currentShiftSummary(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await openShift(ctx, await body(req, ShiftOpenInput)), { status: 201 }));
