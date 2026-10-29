import { NextResponse } from "next/server";
import { SettingsInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { getSettings, updateSettings } from "@/server/settings";

export const GET = route(async (_req, ctx) => NextResponse.json(await getSettings(ctx)));
export const PUT = route(async (req, ctx) => {
  await updateSettings(ctx, await body(req, SettingsInput));
  return NextResponse.json({ ok: true });
});
