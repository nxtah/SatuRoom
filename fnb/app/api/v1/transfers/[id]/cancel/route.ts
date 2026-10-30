import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { cancelTransfer } from "@/server/transfers";

export const POST = route<{ id: string }>(async (_req, ctx, { id }) => { await cancelTransfer(ctx, id); return NextResponse.json({ ok: true }); });
