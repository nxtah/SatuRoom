// Database tes terpisah; aplikasi terhubung sebagai fnb_app (tanpa BYPASSRLS), sama seperti produksi.
Object.assign(process.env, {
  DATABASE_URL: "postgresql://fnb_app:fnb-dev-only@localhost:5434/saturoom_test",
  APP_URL: "http://localhost:3300",
  COOKIE_SECURE: "false",
});
export {};
