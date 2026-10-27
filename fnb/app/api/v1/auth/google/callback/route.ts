import { loginWithGoogle } from "@saturoom/core/auth";
import { finishGoogle } from "@saturoom/core/google";
import { NextResponse } from "next/server";
import { PRODUCT } from "@/server/context";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { googleConfig, setSessionCookie, takeHandshake } from "@/server/google";
import { clientIp, withinLimit } from "@/server/rate-limit";

export async function GET(req: Request) {
  const home = new URL(env().APP_URL).origin;
  const back = (why: string) => NextResponse.redirect(`${home}/masuk?galat=${why}`);
  const cfg = googleConfig();
  const handshake = await takeHandshake();
  if (!cfg || !handshake || !withinLimit(`google-cb:${clientIp(req)}`, 30, 15 * 60_000)) return back("google");
  try {
    const q = new URL(req.url).searchParams;
    const profile = await finishGoogle(cfg, handshake, { code: q.get("code"), state: q.get("state") });
    const { token } = await loginWithGoogle(db(), profile, PRODUCT);
    await setSessionCookie(token);
    return NextResponse.redirect(`${home}${handshake.next}`);
  } catch (e) {
    return back(e instanceof Error && e.message === "GOOGLE_CONFLICT" ? "google_conflict" : "google");
  }
}
