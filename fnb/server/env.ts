import "server-only";
import { z } from "zod";
const Env = z.object({ DATABASE_URL: z.string().url(), APP_URL: z.string().url(), GOOGLE_CLIENT_ID: z.string().min(10).optional(), GOOGLE_CLIENT_SECRET: z.string().min(10).optional(), COOKIE_SECURE: z.enum(["true","false"]).transform(v=>v==="true") });
let cache: z.infer<typeof Env> | undefined;
export function env(){ const parsed=Env.safeParse(process.env); if(!parsed.success) throw new Error(`Konfigurasi belum lengkap: ${parsed.error.issues.map(i=>i.path.join(".")).join(", ")}`); return cache ??= parsed.data; }
