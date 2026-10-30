import { NextResponse } from "next/server";
import { PrinterInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { listPrinters, savePrinter } from "@/server/printers";

export const GET = route(async (_req, ctx) => NextResponse.json(await listPrinters(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await savePrinter(ctx, await body(req, PrinterInput)), { status: 201 }));
