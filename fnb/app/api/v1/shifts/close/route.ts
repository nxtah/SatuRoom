import { NextResponse } from "next/server";
import { ShiftCloseInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { closeShift } from "@/server/payments";

export const POST = route(async (req, ctx) => NextResponse.json(await closeShift(ctx, await body(req, ShiftCloseInput))));
