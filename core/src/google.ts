/**
 * Masuk dengan Google (OAuth 2.0 authorization code + PKCE). Tanpa dependensi: hanya fetch ke Google.
 * Klien (browser) memegang `state`, `nonce`, dan `verifier` di cookie sementara yang httpOnly.
 */
import { createHash, randomBytes } from "node:crypto";
import type { GoogleProfile } from "./auth";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleHandshake {
  state: string;
  nonce: string;
  verifier: string;
  /** Tujuan setelah masuk; hanya jalur internal dari daftar tetap yang diisi pemanggil. */
  next: string;
}

const b64url = (b: Buffer) => b.toString("base64url");

export function startGoogle(cfg: GoogleConfig, next: string): { url: string; handshake: GoogleHandshake } {
  const handshake = { state: b64url(randomBytes(24)), nonce: b64url(randomBytes(24)), verifier: b64url(randomBytes(48)), next };
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: handshake.state,
    nonce: handshake.nonce,
    code_challenge: b64url(createHash("sha256").update(handshake.verifier).digest()),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), handshake };
}

/** Memeriksa klaim id_token yang sudah diterima langsung dari Google lewat HTTPS. */
export function profileFromClaims(claims: Record<string, unknown>, cfg: GoogleConfig, nonce: string, now = Date.now()): GoogleProfile {
  const exp = Number(claims.exp);
  if (
    !ISSUERS.has(String(claims.iss)) ||
    claims.aud !== cfg.clientId ||
    claims.nonce !== nonce ||
    !Number.isFinite(exp) ||
    exp * 1000 < now ||
    claims.email_verified !== true ||
    typeof claims.sub !== "string" ||
    typeof claims.email !== "string"
  ) {
    throw new Error("GOOGLE_INVALID");
  }
  return { sub: claims.sub, email: claims.email, name: typeof claims.name === "string" ? claims.name : "" };
}

export async function finishGoogle(
  cfg: GoogleConfig,
  handshake: GoogleHandshake,
  query: { code: string | null; state: string | null },
): Promise<GoogleProfile> {
  if (!query.code || !query.state || query.state !== handshake.state) throw new Error("GOOGLE_INVALID");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: query.code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
      code_verifier: handshake.verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error("GOOGLE_INVALID");
  const { id_token } = (await res.json()) as { id_token?: string };
  const payload = id_token?.split(".")[1];
  if (!payload) throw new Error("GOOGLE_INVALID");
  return profileFromClaims(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")), cfg, handshake.nonce);
}
