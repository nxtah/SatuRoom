import { NextResponse } from "next/server";
import { ReceiptTemplateInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { getTemplate, saveTemplate } from "@/server/receipt-template";

export const GET = route(async (_req, ctx) => NextResponse.json(await getTemplate(ctx)));
export const PUT = route(async (req, ctx) => { await saveTemplate(ctx, await body(req, ReceiptTemplateInput)); return NextResponse.json({ ok: true }); });
