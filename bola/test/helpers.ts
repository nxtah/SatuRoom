import { getSession, login, registerUser, verifyEmail, type SessionInfo } from "@saturoom/core/auth";
import { db } from "@/server/db";

let n = 0;

/** Pengguna terverifikasi dengan sesi aktif. */
export async function userWithSession(name = "Pengguna"): Promise<SessionInfo & { token: string }> {
  const email = `u${Date.now()}-${n++}@contoh.id`;
  const reg = await registerUser(db(), { name, email, password: "password-rahasia" });
  if (reg.status !== "created") throw new Error("gagal daftar");
  await verifyEmail(db(), reg.verifyToken);
  const res = await login(db(), { email, password: "password-rahasia", product: "bola" });
  if (res.status !== "ok") throw new Error("gagal masuk");
  const session = await getSession(db(), res.token, "bola");
  return { ...session!, token: res.token };
}

/** Sesi segar (mis. setelah active business berubah). */
export async function refresh(s: { token: string }): Promise<SessionInfo & { token: string }> {
  return { ...(await getSession(db(), s.token, "bola"))!, token: s.token };
}
