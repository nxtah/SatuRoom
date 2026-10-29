import { getSession, login, registerUser, verifyEmail, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { memberships } from "@saturoom/core/schema";
import { loadVenueContext, type VenueContext } from "@/server/context";
import { db } from "@/server/db";
import type { Role } from "@/server/permissions";
import { staffRoles } from "@/server/schema";
import { createMember } from "@/server/members";
import { listTables } from "@/server/tables";
import { createVenue, switchVenue } from "@/server/venue";

let n = 0;

/** Pengguna terverifikasi dengan sesi aktif. */
export async function userWithSession(name = "Pengguna"): Promise<SessionInfo & { token: string }> {
  const email = `u${Date.now()}-${n++}@contoh.id`;
  const reg = await registerUser(db(), { name, email, password: "password-rahasia" });
  if (reg.status !== "created") throw new Error("gagal daftar");
  await verifyEmail(db(), reg.verifyToken);
  const res = await login(db(), { email, password: "password-rahasia", product: "mahjong" });
  if (res.status !== "ok") throw new Error("gagal masuk");
  const session = await getSession(db(), res.token, "mahjong");
  return { ...session!, token: res.token };
}

export async function refresh(s: { token: string }): Promise<SessionInfo & { token: string }> {
  return { ...(await getSession(db(), s.token, "mahjong"))!, token: s.token };
}

/** Tempat baru (dengan empat meja contoh) beserta pemiliknya. */
export async function venueOf(name: string) {
  const owner = await userWithSession(`Pemilik ${name}`);
  const id = await createVenue(owner, { name, city: "Bandung" });
  const session = await refresh(owner);
  const ctx = await loadVenueContext(session);
  return { id, session, ctx, tables: await listTables(ctx) };
}

/** Menambahkan staf dengan peran tertentu ke tempat, lalu mengembalikan konteksnya. */
export async function staffOf(venue: { id: string; ctx: VenueContext }, roles: Role[], name = "Staf"): Promise<VenueContext> {
  const user = await userWithSession(name);
  await withContext(db(), { userId: venue.ctx.userId, businessId: venue.id }, async (tx) => {
    const [m] = await tx.insert(memberships).values({ businessId: venue.id, userId: user.userId }).returning();
    await tx.insert(staffRoles).values(roles.map((role) => ({ businessId: venue.id, membershipId: m!.id, role })));
  });
  await switchVenue(user, venue.id);
  return loadVenueContext(await refresh(user));
}

let phone = 81_000_000_00;
export const memberOf = (ctx: VenueContext, fullName = "Budi", tier: "regular" | "silver" | "gold" = "regular") =>
  createMember(ctx, { fullName, phone: `0${phone++}`, tier, note: null });
