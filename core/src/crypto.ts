import { hash, verify } from "@node-rs/argon2";
import { createHash, randomBytes } from "node:crypto";

// Parameter argon2id mengikuti rekomendasi OWASP (19 MiB, 2 iterasi).
const ARGON = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export const hashPassword = (password: string) => hash(password, ARGON);

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  try {
    return await verify(stored, password);
  } catch {
    return false;
  }
}

/** Token acak untuk cookie/link. Yang disimpan di database hanya hash-nya. */
export function newToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: tokenHash(token) };
}

export const tokenHash = (token: string): Buffer => createHash("sha256").update(token).digest();

/** Hash tiruan agar waktu respons login sama walau email tidak terdaftar. */
let dummy: Promise<string> | undefined;
export const dummyPasswordHash = () => (dummy ??= hashPassword("tidak-dipakai-" + randomBytes(8).toString("hex")));
