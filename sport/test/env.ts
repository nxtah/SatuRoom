// Database tes terpisah; aplikasi terhubung sebagai bola_app (tanpa BYPASSRLS), sama seperti produksi.
Object.assign(process.env, {
  DATABASE_URL: "postgresql://bola_app:bola-dev-only@localhost:5434/saturoom_test",
  APP_URL: "http://localhost:3200",
  SITE_URL: "http://localhost:3100",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1026",
  MAIL_FROM: "SatuRoom Bola <no-reply@saturoom.com>",
  COOKIE_SECURE: "false",
});
