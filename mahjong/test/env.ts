// Database tes terpisah; aplikasi terhubung sebagai mahjong_app (tanpa BYPASSRLS), sama seperti produksi.
Object.assign(process.env, {
  DATABASE_URL: "postgresql://mahjong_app:mahjong-dev-only@localhost:5434/saturoom_test",
  APP_URL: "http://localhost:3400",
  SITE_URL: "http://localhost:3100",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1026",
  MAIL_FROM: "SatuRoom Mahjong <no-reply@saturoom.com>",
  COOKIE_SECURE: "false",
});
export {};
