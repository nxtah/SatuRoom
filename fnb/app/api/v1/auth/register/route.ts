import { createSession, registerUser } from "@saturoom/core/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PRODUCT } from "@/server/context";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { setSessionCookie } from "@/server/google";
import { sendVerifyEmail } from "@/server/mail";
import { clientIp, withinLimit } from "@/server/rate-limit";

const Input = z.object({
  name: z.string().trim().min(2, "Isi nama Anda.").max(100),
  email: z.string().trim().email("Email belum benar.").max(254),
  password: z.string().min(8, "Password minimal 8 karakter.").max(200),
});

export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(env().APP_URL).origin) {
    return NextResponse.json({ error: "Permintaan ditolak." }, { status: 403 });
  }
  if (!withinLimit(`register:${clientIp(req)}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, { status: 429 });
  }
  const parsed = Input.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Periksa isian." }, { status: 422 });
  const result = await registerUser(db(), parsed.data);
  if (result.status === "exists") {
    return NextResponse.json({ error: "Email ini sudah terdaftar. Silakan masuk." }, { status: 409 });
  }
  // Langsung masuk tanpa menunggu konfirmasi. Email yang belum dikonfirmasi belum bisa membuka undangan staf.
  await sendVerifyEmail(parsed.data.email, parsed.data.name, result.verifyToken).catch((e: unknown) => console.error("gagal kirim konfirmasi", e instanceof Error ? e.message : e));
  await setSessionCookie(await createSession(db(), result.userId, PRODUCT));
  return NextResponse.json({ ok: true }, { status: 201 });
}
