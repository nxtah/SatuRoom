import { NextResponse } from "next/server";
import { TransferInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { createTransfer, listTransfers } from "@/server/transfers";

export const GET = route(async (_req, ctx) => NextResponse.json(await listTransfers(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await createTransfer(ctx, await body(req, TransferInput)), { status: 201 }));
