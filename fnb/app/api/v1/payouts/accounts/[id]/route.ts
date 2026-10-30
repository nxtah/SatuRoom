import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { archivePayoutAccount } from "@/server/payouts";

export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => { await archivePayoutAccount(ctx, id); return NextResponse.json({ ok: true }); });
