import "server-only";
import type { GoogleConfig, GoogleHandshake } from "@saturoom/core/google";
import { cookies } from "next/headers";
import { env } from "./env";

/** Tombol Google hanya muncul bila kuncinya sudah diisi di server. */
export function googleConfig(): GoogleConfig | null {
  const e = env();
  if (!e.GOOGLE_CLIENT_ID || !e.GOOGLE_CLIENT_SECRET) return null;
  return {
    clientId: e.GOOGLE_CLIENT_ID,
    clientSecret: e.GOOGLE_CLIENT_SECRET,
    redirectUri: `${new URL(e.APP_URL).origin}/api/v1/auth/google/callback`,
  };
}

const handshakeCookie = () => (env().COOKIE_SECURE ? "__Host-sr_bola_google" : "sr_bola_google");

export async function saveHandshake(h: GoogleHandshake): Promise<void> {
  (await cookies()).set(handshakeCookie(), Buffer.from(JSON.stringify(h)).toString("base64url"), {
    httpOnly: true,
    secure: env().COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

/** Dibaca sekali: cookie langsung dihapus. */
export async function takeHandshake(): Promise<GoogleHandshake | null> {
  const jar = await cookies();
  const raw = jar.get(handshakeCookie())?.value;
  jar.delete(handshakeCookie());
  if (!raw) return null;
  try {
    const h = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as GoogleHandshake;
    return h.state && h.nonce && h.verifier && h.next ? h : null;
  } catch {
    return null;
  }
}
