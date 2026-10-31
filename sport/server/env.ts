import "server-only";
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url(),
  SITE_URL: z.string().url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().min(3),
  CLOUDINARY_CLOUD_NAME: z.string().min(2).optional(),
  CLOUDINARY_API_KEY: z.string().min(4).optional(),
  CLOUDINARY_API_SECRET: z.string().min(8).optional(),
  GOOGLE_CLIENT_ID: z.string().min(10).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(10).optional(),
  COOKIE_SECURE: z.enum(["true", "false"]).transform((v) => v === "true"),
});

let cached: z.infer<typeof Env> | undefined;

/** Dibaca saat pertama dipakai; nilai yang hilang menghentikan aplikasi dengan nama variabelnya saja. */
export function env() {
  if (cached) return cached;
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Konfigurasi belum lengkap: ${names}`);
  }
  return (cached = parsed.data);
}
