import { NextResponse } from "next/server";
import { BusinessProfileInput } from "@/lib/schemas";
import { getProfile, saveProfile } from "@/server/business-profile";
import { body, route } from "@/server/http";

export const GET = route(async (_req, ctx) => NextResponse.json(await getProfile(ctx)));
export const PUT = route(async (req, ctx) => { await saveProfile(ctx, await body(req, BusinessProfileInput)); return NextResponse.json({ ok: true }); });
