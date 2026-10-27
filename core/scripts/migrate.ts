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
  { scope: "fnb", dir: join(root, "fnb", "migrations") },
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
    await setupFnbRole(sql, process.env.FNB_DB_PASSWORD);
    log("role fnb_app siap");
    log("role bola_app siap");
  } finally {
    await sql.end();
  }
}

/**
 * Password F&B hanya diubah bila FNB_DB_PASSWORD diisi. Kalau tidak, role dibiarkan memakai
 * password yang sudah ada supaya menjalankan migrasi untuk produk lain tidak memutus koneksi F&B.
 */
async function setupFnbRole(sql: postgres.Sql, password?: string): Promise<void> {
  const [exists] = await sql`SELECT 1 FROM pg_roles WHERE rolname = 'fnb_app'`;
  if (!exists) await sql.unsafe(`CREATE ROLE fnb_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`);
  if (password) {
    const [stmt] = await sql<{ q: string }[]>`SELECT format('ALTER ROLE fnb_app PASSWORD %L', ${password}::text) AS q`;
    await sql.unsafe(stmt!.q);
  } else if (!exists) {
    console.log("fnb_app dibuat tanpa password; isi FNB_DB_PASSWORD untuk bisa login");
  }
  await sql.unsafe(`
    GRANT USAGE ON SCHEMA core, fnb TO fnb_app;
    GRANT SELECT, INSERT ON core.users TO fnb_app;
    GRANT UPDATE (name, password_hash, email_verified_at, google_sub, updated_at) ON core.users TO fnb_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON core.sessions, core.auth_tokens TO fnb_app;
    GRANT SELECT, INSERT, UPDATE ON core.businesses, core.memberships TO fnb_app;
    GRANT EXECUTE ON FUNCTION core.login_business(text, uuid, text), core.user_has_business(uuid, text) TO fnb_app;
    GRANT SELECT, INSERT ON core.audit_events TO fnb_app;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA core, fnb TO fnb_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA fnb TO fnb_app;
  `);
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
    GRANT UPDATE (name, password_hash, email_verified_at, google_sub, updated_at) ON core.users TO bola_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON core.sessions, core.auth_tokens TO bola_app;
    GRANT SELECT, INSERT, UPDATE ON core.businesses, core.memberships TO bola_app;
    GRANT EXECUTE ON FUNCTION core.login_business(text, uuid, text), core.user_has_business(uuid, text) TO bola_app;
    GRANT SELECT, INSERT ON core.audit_events TO bola_app;
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA core, bola TO bola_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA bola TO bola_app;
  `);
  // Data pemain dan tim tidak dihapus permanen oleh aplikasi: hanya dinonaktifkan/diarsipkan.
  for (const table of ["bola.players", "bola.teams", "bola.invoices"]) {
    const [found] = await sql`SELECT to_regclass(${table}) AS t`;
    if (found?.t) await sql.unsafe(`REVOKE DELETE ON ${table} FROM bola_app`);
  }
  // Fungsi SECURITY DEFINER hanya untuk aplikasi bola (EXECUTE dicabut dari PUBLIC di migrasinya).
  for (const fn of [
    "bola.my_invitations()",
    "bola.accept_invitation(uuid)",
    "bola.my_player()",
    "bola.my_player_invitations()",
    "bola.accept_player_invitation(uuid, text)",
    "bola.registration_academy(text)",
    "bola.submit_registration(text, text, date, text, text, text)",
  ]) {
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
