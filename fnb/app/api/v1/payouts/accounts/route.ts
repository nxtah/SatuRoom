import { NextResponse } from "next/server";
import { PayoutAccountInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { savePayoutAccount } from "@/server/payouts";

export const POST = route(async (req, ctx) => NextResponse.json(await savePayoutAccount(ctx, await body(req, PayoutAccountInput)), { status: 201 }));
