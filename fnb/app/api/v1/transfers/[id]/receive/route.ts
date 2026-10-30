import { NextResponse } from "next/server";
import { TransferReceiveInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { receiveTransfer } from "@/server/transfers";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => { await receiveTransfer(ctx, id, await body(req, TransferReceiveInput)); return NextResponse.json({ ok: true }); });
