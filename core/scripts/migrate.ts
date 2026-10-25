/**
 * Menjalankan migrasi SQL secara berurutan: core/migrations lalu bola/migrations, lalu
 * menyiapkan user database runtime (`bola_app`) dengan izin minimum.
 *
 *   MIGRATOR_DATABASE_URL=... BOLA_DB_PASSWORD=... pnpm db:migrate
 *
 * Tiap file dijalankan sekali di dalam transaksi; isinya dicatat dengan checksum sehingga file
 * yang sudah diterapkan lalu diubah akan menghentikan proses (buat file migrasi baru sebagai gantinya).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCOPES = [
  { scope: "core", dir: join(root, "core", "migrations") },
  { scope: "bola", dir: join(root, "bola", "migrations") },
];

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} belum diisi`);
  return value;
}

export async function migrate(url: string, bolaPassword: string, log = console.log): Promise<void> {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS public.saturoom_migrations (
      scope text NOT NULL, name text NOT NULL, checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (scope, name))`;

    for (const { scope, dir } of SCOPES) {
      const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
      for (const name of files) {
        const body = readFileSync(join(dir, name), "utf8");
        const checksum = createHash("sha256").update(body).digest("hex");
        const [done] = await sql<{ checksum: string }[]>`
          SELECT checksum FROM public.saturoom_migrations WHERE scope = ${scope} AND name = ${name}`;
        if (done) {
          if (done.checksum !== checksum) {
            throw new Error(`${scope}/${name} sudah diterapkan tetapi isinya berubah`);
          }
          continue;
        }
        await sql.begin(async (tx) => {
          await tx.unsafe(body);
          await tx`INSERT INTO public.saturoom_migrations (scope, name, checksum)
                   VALUES (${scope}, ${name}, ${checksum})`;
        });
        log(`diterapkan ${scope}/${name}`);
      }
    }
    await setupBolaRole(sql, bolaPassword);
    log("role bola_app siap");
  } finally {
    await sql.end();
  }
}

/** Idempoten: aman dijalankan setelah setiap migrasi agar tabel baru ikut ter-grant. */
async function setupBolaRole(sql: postgres.Sql, password: string): Promise<void> {
  const [exists] = await sql`SELECT 1 FROM pg_roles WHERE rolname = 'bola_app'`;
  if (!exists) {
    await sql.unsafe(`CREATE ROLE bola_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  }
  // Quoting password diserahkan ke Postgres (format %L), bukan disusun manual.
  const [stmt] = await sql<{ q: string }[]>`SELECT format('ALTER ROLE bola_app PASSWORD %L', ${password}::text) AS q`;
  await sql.unsafe(stmt!.q);
  await sql.unsafe(`
    GRANT USAGE ON SCHEMA core, bola TO bola_app;
    GRANT SELECT, INSERT ON core.users TO bola_app;
    GRANT UPDATE (name, password_hash, email_verified_at, updated_at) ON core.users TO bola_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON core.sessions, core.auth_tokens TO bola_app;
    GRANT SELECT, INSERT, UPDATE ON core.businesses, core.memberships TO bola_app;
    GRANT SELECT, INSERT ON core.audit_events TO bola_app;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA core, bola TO bola_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA bola TO bola_app;
  `);
  // Data pemain dan tim tidak dihapus permanen oleh aplikasi: hanya dinonaktifkan/diarsipkan.
  for (const table of ["bola.players", "bola.teams"]) {
    const [found] = await sql`SELECT to_regclass(${table}) AS t`;
    if (found?.t) await sql.unsafe(`REVOKE DELETE ON ${table} FROM bola_app`);
  }
  // Fungsi SECURITY DEFINER hanya untuk aplikasi bola (EXECUTE dicabut dari PUBLIC di migrasinya).
  for (const fn of ["bola.my_invitations()", "bola.accept_invitation(uuid)"]) {
    const [found] = await sql`SELECT to_regprocedure(${fn}) AS f`;
    if (found?.f) await sql.unsafe(`GRANT EXECUTE ON FUNCTION ${fn} TO bola_app`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate(required("MIGRATOR_DATABASE_URL"), required("BOLA_DB_PASSWORD")).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
