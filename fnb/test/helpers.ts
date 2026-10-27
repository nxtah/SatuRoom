import { getSession, login, registerUser, verifyEmail, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { memberships } from "@saturoom/core/schema";
import { createFnbBusiness } from "@/server/business";
import { createCatalog } from "@/server/catalog";
import { loadContext, type FnbContext } from "@/server/context";
import { db } from "@/server/db";
import { staffRoles } from "@/server/schema";

let n = 0;

async function userWithSession(name: string): Promise<SessionInfo & { token: string }> {
  const email = `f${Date.now()}-${n++}@contoh.id`;
  const reg = await registerUser(db(), { name, email, password: "password-rahasia" });
  if (reg.status !== "created") throw new Error("gagal daftar");
  await verifyEmail(db(), reg.verifyToken);
  const res = await login(db(), { email, password: "password-rahasia", product: "fnb" });
  if (res.status !== "ok") throw new Error("gagal masuk");
  return { ...(await getSession(db(), res.token, "fnb"))!, token: res.token };
}

/** Bisnis F&B baru beserta konteks pemiliknya. */
export async function businessOf(name: string) {
  const owner = await userWithSession(`Pemilik ${name}`);
  const id = await createFnbBusiness(owner, { name, city: "Bandung" });
  const session = { ...(await getSession(db(), owner.token, "fnb"))!, token: owner.token };
  return { id, ctx: (await loadContext(session))! };
}

/** Menambahkan staf dengan peran tertentu ke bisnis. */
export async function staffOf(biz: { id: string; ctx: FnbContext }, roles: ("manager" | "cashier" | "kitchen" | "inventory")[]) {
  const user = await userWithSession("Staf");
  await withContext(db(), { userId: biz.ctx.userId, businessId: biz.id }, async (tx) => {
    const [m] = await tx.insert(memberships).values({ businessId: biz.id, userId: user.userId }).returning();
    await tx.insert(staffRoles).values(roles.map((role) => ({ businessId: biz.id, membershipId: m!.id, role })));
  });
  const { setActiveBusiness } = await import("@saturoom/core/auth");
  await setActiveBusiness(db(), user.sessionId, biz.id);
  return (await loadContext({ ...(await getSession(db(), user.token, "fnb"))! }))!;
}

/** Satu menu siap jual di bisnis. */
export async function menuItemOf(ctx: FnbContext, name = "Nasi goreng", price = 25000) {
  const { id: categoryId } = await createCatalog(ctx, { type: "category", name: "Utama" });
  const { id } = await createCatalog(ctx, { type: "item", name, categoryId, stationId: null, price });
  return id;
}
