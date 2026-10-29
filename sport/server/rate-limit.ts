import "server-only";
import { AppError } from "./errors";

/**
 * Pembatas sederhana di memori (cukup untuk satu instance). Bila nanti lebih dari satu instance,
 * pindahkan ke Redis atau tabel database.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    const wait = Math.ceil((windowMs - (now - recent[0]!)) / 60_000);
    throw new AppError(429, "too_many", `Terlalu banyak percobaan. Coba lagi dalam ${wait} menit.`);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
}
