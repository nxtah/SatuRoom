import { NextResponse } from "next/server";
import { PrinterInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { archivePrinter, savePrinter } from "@/server/printers";

export const PUT = route<{ id: string }>(async (req, ctx, { id }) => NextResponse.json(await savePrinter(ctx, await body(req, PrinterInput), id)));
export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => { await archivePrinter(ctx, id); return NextResponse.json({ ok: true }); });
