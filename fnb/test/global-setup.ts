import postgres from "postgres";
import { migrate } from "../../core/scripts/migrate";

const ADMIN = "postgresql://saturoom:saturoom-dev-only@localhost:5434/saturoom";
const TEST = "postgresql://saturoom:saturoom-dev-only@localhost:5434/saturoom_test";

/** Membuat ulang database tes dari nol lalu menjalankan semua migrasi. */
export default async function setup() {
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe("DROP DATABASE IF EXISTS saturoom_test WITH (FORCE)");
  await admin.unsafe("CREATE DATABASE saturoom_test");
  await admin.end();
  process.env.FNB_DB_PASSWORD = "fnb-dev-only";
  await migrate(TEST, "bola-dev-only", () => {});
}
