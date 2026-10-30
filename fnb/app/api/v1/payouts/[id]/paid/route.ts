import { NextResponse } from "next/server";
import { PayoutPaidInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { markPayoutPaid } from "@/server/payouts";

export const POST = route<{ id: string }>(async (req, ctx, { id }) => { await markPayoutPaid(ctx, id, await body(req, PayoutPaidInput)); return NextResponse.json({ ok: true }); });
