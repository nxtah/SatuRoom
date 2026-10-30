import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { sendTransfer } from "@/server/transfers";

export const POST = route<{ id: string }>(async (_req, ctx, { id }) => { await sendTransfer(ctx, id); return NextResponse.json({ ok: true }); });
