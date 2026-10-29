import "server-only";
import { getSession, type SessionInfo } from "@saturoom/core/auth";
import { withContext, type Tx } from "@saturoom/core/db";
import { memberships } from "@saturoom/core/schema";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { env } from "./env";
import { AppError, forbidden, unauthorized } from "./errors";
import { permissionsFor, type Permission, type Role } from "./permissions";
import { staffRoles } from "./schema";

export const PRODUCT = "mahjong";

/** Nama cookie sesi. Di HTTPS memakai prefix __Host- (hanya host ini, wajib Secure, path /). */
export const sessionCookieName = () => (env().COOKIE_SECURE ? "__Host-sr_mahjong" : "sr_mahjong");

/** Sesi dari cookie, sekali per request. */
export const currentSession = cache(async (): Promise<SessionInfo | null> => {
  const token = (await cookies()).get(sessionCookieName())?.value;
  if (!token) return null;
  return getSession(db(), token, PRODUCT);
});

export async function requireSession(): Promise<SessionInfo> {
  const session = await currentSession();
  if (!session) throw unauthorized();
  return session;
}

export interface VenueContext {
  session: SessionInfo;
  userId: string;
  businessId: string;
  membershipId: string;
  roles: Role[];
  can: (p: Permission) => boolean;
}

/**
 * Konteks tempat aktif. Keanggotaan dan peran selalu dibaca ulang dari database: id tempat
 * di sesi bukan bukti akses. Melempar 409 `no_venue` bila belum memilih/membuat tempat.
 */
export const venueContext = cache(async (): Promise<VenueContext> => loadVenueContext(await requireSession()));

export async function loadVenueContext(session: SessionInfo): Promise<VenueContext> {
  const businessId = session.activeBusinessId;
  if (!businessId) throw new AppError(409, "no_venue", "Pilih atau buat tempat dulu.");
  const found = await withContext(db(), { userId: session.userId, businessId }, async (tx) => {
    const [m] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(eq(memberships.businessId, businessId), eq(memberships.userId, session.userId), eq(memberships.status, "active")),
      );
    if (!m) return null;
    const rows = await tx.select({ role: staffRoles.role }).from(staffRoles).where(eq(staffRoles.membershipId, m.id));
    return { membershipId: m.id, roles: rows.map((r) => r.role) };
  });
  if (!found || found.roles.length === 0) throw new AppError(409, "no_venue", "Pilih atau buat tempat dulu.");
  const perms = permissionsFor(found.roles);
  return {
    session,
    userId: session.userId,
    businessId,
    membershipId: found.membershipId,
    roles: found.roles,
    can: (p) => perms.has(p),
  };
}

export function requirePermission(ctx: VenueContext, p: Permission): void {
  if (!ctx.can(p)) throw forbidden();
}

/** Transaksi dengan RLS terisi untuk tempat aktif. Semua query data tempat lewat sini. */
export function inVenue<T>(ctx: VenueContext, work: (tx: Tx) => Promise<T>): Promise<T> {
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
}
