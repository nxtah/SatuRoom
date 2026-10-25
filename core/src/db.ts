import { sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Db = PostgresJsDatabase;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createDb(url: string, max = 10): { db: Db; close: () => Promise<void> } {
  const client = postgres(url, { max, onnotice: () => {} });
  return { db: drizzle(client), close: () => client.end() };
}

/**
 * Menjalankan kerja di dalam transaksi dengan konteks RLS: `app.user_id` dan `app.business_id`
 * hanya berlaku sampai transaksi selesai (set_config ..., true), jadi tidak bocor ke koneksi lain.
 */
export function withContext<T>(
  db: Db,
  ctx: { userId?: string | null; businessId?: string | null },
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.user_id', ${ctx.userId ?? ""}, true),
                 set_config('app.business_id', ${ctx.businessId ?? ""}, true)`,
    );
    return work(tx);
  });
}
