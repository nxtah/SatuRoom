import "server-only";
import { createDb, type Db } from "@saturoom/core/db";
import { env } from "./env";

// Satu pool per proses; disimpan di globalThis agar hot reload saat dev tidak membuka pool baru.
const g = globalThis as unknown as { __bolaDb?: Db };

export function db(): Db {
  return (g.__bolaDb ??= createDb(env().DATABASE_URL).db);
}
