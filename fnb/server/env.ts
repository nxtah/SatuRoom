import "server-only";
import { z } from "zod";
const Env = z.object({ DATABASE_URL: z.string().url(), APP_URL: z.string().url(), SMTP_HOST: z.string().min(1).optional(), SMTP_PORT: z.coerce.number().int().positive().default(587), SMTP_USER: z.string().optional(), SMTP_PASS: z.string().optional(), MAIL_FROM: z.string().min(3).default("SatuRoom Rasa <no-reply@saturoom.com>"), GOOGLE_CLIENT_ID: z.string().min(10).optional(), GOOGLE_CLIENT_SECRET: z.string().min(10).optional(), COOKIE_SECURE: z.enum(["true","false"]).transform(v=>v==="true") });
let cache: z.infer<typeof Env> | undefined;
export function env(){ const parsed=Env.safeParse(process.env); if(!parsed.success) throw new Error(`Konfigurasi belum lengkap: ${parsed.error.issues.map(i=>i.path.join(".")).join(", ")}`); return cache ??= parsed.data; }
