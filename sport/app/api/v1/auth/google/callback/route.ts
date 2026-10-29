import { loginWithGoogle } from "@saturoom/core/auth";
import { finishGoogle } from "@saturoom/core/google";
import { NextResponse, type NextRequest } from "next/server";
import { PRODUCT } from "@/server/context";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { googleConfig, takeHandshake } from "@/server/google";
import { clientIp, setSessionCookie } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export async function GET(req: NextRequest) {
  const home = new URL(env().APP_URL).origin;
  const back = (why: string) => NextResponse.redirect(`${home}/masuk?galat=${why}`);
  const cfg = googleConfig();
  const handshake = await takeHandshake();
  if (!cfg || !handshake) return back("google");
  try {
    rateLimit(`google-cb:${clientIp(req)}`, 30, 15 * 60_000);
    const q = req.nextUrl.searchParams;
    const profile = await finishGoogle(cfg, handshake, { code: q.get("code"), state: q.get("state") });
    const { token } = await loginWithGoogle(db(), profile, PRODUCT);
    await setSessionCookie(token);
    return NextResponse.redirect(`${home}${handshake.next}`);
  } catch (e) {
    return back(e instanceof Error && e.message === "GOOGLE_CONFLICT" ? "google_conflict" : "google");
  }
}
