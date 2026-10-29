import { getSession, login, registerUser, verifyEmail, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { memberships } from "@saturoom/core/schema";
import { createAcademy, switchAcademy } from "@/server/academy";
import { loadAcademyContext, type AcademyContext } from "@/server/context";
import type { Role } from "@/server/permissions";
import { staffRoles } from "@/server/schema";
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

/** Akademi baru dengan pemiliknya. */
export async function academyOf(name: string) {
  const owner = await userWithSession(`Pemilik ${name}`);
  const id = await createAcademy(owner, { name, city: "Bandung" });
  const session = await refresh(owner);
  return { id, session, ctx: await loadAcademyContext(session) };
}

/** Menambahkan staf dengan peran tertentu ke akademi, lalu mengembalikan konteksnya. */
export async function staffOf(
  academy: { id: string; ctx: AcademyContext },
  roles: Role[],
  name = "Staf",
): Promise<AcademyContext> {
  const user = await userWithSession(name);
  await withContext(db(), { userId: academy.ctx.userId, businessId: academy.id }, async (tx) => {
    const [m] = await tx.insert(memberships).values({ businessId: academy.id, userId: user.userId }).returning();
    await tx.insert(staffRoles).values(roles.map((role) => ({ businessId: academy.id, membershipId: m!.id, role })));
  });
  await switchAcademy(user, academy.id);
  return loadAcademyContext(await refresh(user));
}
