import { NextResponse } from "next/server";
import { PayoutCancelInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { cancelPayout } from "@/server/payouts";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => { await cancelPayout(ctx, id, await body(req, PayoutCancelInput)); return NextResponse.json({ ok: true }); });
