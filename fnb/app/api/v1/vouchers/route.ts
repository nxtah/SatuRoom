import { NextResponse } from "next/server";
import { VoucherInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { createVoucher, listVouchers } from "@/server/promos";

export const GET = route(async (_req, ctx) => NextResponse.json(await listVouchers(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await createVoucher(ctx, await body(req, VoucherInput)), { status: 201 }));
