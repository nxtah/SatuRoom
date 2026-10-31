// Database tes terpisah; aplikasi terhubung sebagai bola_app (tanpa BYPASSRLS), sama seperti produksi.
Object.assign(process.env, {
  DATABASE_URL: "postgresql://bola_app:bola-dev-only@localhost:5434/saturoom_test",
  APP_URL: "http://localhost:3200",
  SITE_URL: "http://localhost:3100",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1026",
  MAIL_FROM: "SatuRoom Sport <no-reply@saturoom.com>",
  COOKIE_SECURE: "false",
  // Kunci palsu khusus tes: hanya untuk tanda tangan dan validasi URL, tidak menghubungi Cloudinary.
  CLOUDINARY_CLOUD_NAME: "tes-cloud",
  CLOUDINARY_API_KEY: "tes-key",
  CLOUDINARY_API_SECRET: "tes-secret-lokal",
});
