import { startGoogle } from "@saturoom/core/google";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/server/env";
import { googleConfig, saveHandshake } from "@/server/google";
import { clientIp } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

/** Tujuan setelah masuk hanya dari daftar tetap, bukan URL bebas (mencegah open redirect). */
const NEXT = { undangan: "/undangan" } as const;

export async function GET(req: NextRequest) {
  const home = new URL(env().APP_URL).origin;
  const cfg = googleConfig();
  if (!cfg) return NextResponse.redirect(`${home}/masuk?galat=google_off`);
  rateLimit(`google:${clientIp(req)}`, 30, 15 * 60_000);
  const lanjut = req.nextUrl.searchParams.get("lanjut") ?? "";
  const { url, handshake } = startGoogle(cfg, lanjut in NEXT ? NEXT[lanjut as keyof typeof NEXT] : "/");
  await saveHandshake(handshake);
  return NextResponse.redirect(url);
}
