import { startGoogle } from "@saturoom/core/google";
import { NextResponse } from "next/server";
import { env } from "@/server/env";
import { googleConfig, saveHandshake } from "@/server/google";
import { clientIp, withinLimit } from "@/server/rate-limit";

export async function GET(req: Request) {
  const home = new URL(env().APP_URL).origin;
  const cfg = googleConfig();
  if (!cfg) return NextResponse.redirect(`${home}/masuk?galat=google_off`);
  if (!withinLimit(`google:${clientIp(req)}`, 30, 15 * 60_000)) return NextResponse.redirect(`${home}/masuk?galat=google`);
  const { url, handshake } = startGoogle(cfg, "/");
  await saveHandshake(handshake);
  return NextResponse.redirect(url);
}
