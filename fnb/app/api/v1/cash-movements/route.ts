import { NextResponse } from "next/server";
import { CashMovementInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { addCashMovement, listCashMovements } from "@/server/payments";

export const GET = route(async (_req, ctx) => NextResponse.json(await listCashMovements(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await addCashMovement(ctx, await body(req, CashMovementInput)), { status: 201 }));
