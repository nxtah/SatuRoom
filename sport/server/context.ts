import "server-only";
import { getSession, type SessionInfo } from "@saturoom/core/auth";
import { withContext, type Tx } from "@saturoom/core/db";
import { memberships } from "@saturoom/core/schema";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";
import { env } from "./env";
import { AppError, forbidden, unauthorized } from "./errors";
import { permissionsFor, type Permission, type Role } from "./permissions";
import { academySettings, customRoles, staffCustomRoles, staffRoles } from "./schema";
import type { SportId } from "@/lib/sports";

export const PRODUCT = "bola";

/** Nama cookie sesi. Di HTTPS memakai prefix __Host- (hanya host ini, wajib Secure, path /). */
export const sessionCookieName = () => (env().COOKIE_SECURE ? "__Host-sr_bola" : "sr_bola");

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

export interface AcademyContext {
  session: SessionInfo;
  userId: string;
  businessId: string;
  membershipId: string;
  /** Cabang olahraga akademi aktif. */
  sport: SportId;
  roles: Role[];
  /** Nama peran custom yang aktif untuk anggota ini. */
  customRoleNames: string[];
  can: (p: Permission) => boolean;
}

/**
 * Konteks akademi aktif. Keanggotaan dan peran selalu dibaca ulang dari database: id akademi
 * di sesi bukan bukti akses. Melempar 409 `no_academy` bila belum memilih/membuat akademi.
 */
export const academyContext = cache(async (): Promise<AcademyContext> => loadAcademyContext(await requireSession()));

export async function loadAcademyContext(session: SessionInfo): Promise<AcademyContext> {
  const businessId = session.activeBusinessId;
  if (!businessId) throw new AppError(409, "no_academy", "Pilih atau buat akademi dulu.");
  const found = await withContext(db(), { userId: session.userId, businessId }, async (tx) => {
    const [m] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.businessId, businessId),
          eq(memberships.userId, session.userId),
          eq(memberships.status, "active"),
        ),
      );
    if (!m) return null;
    const rows = await tx.select({ role: staffRoles.role }).from(staffRoles).where(eq(staffRoles.membershipId, m.id));
    const custom = await tx
      .select({ name: customRoles.name, permissions: customRoles.permissions })
      .from(staffCustomRoles)
      .innerJoin(customRoles, eq(customRoles.id, staffCustomRoles.customRoleId))
      .where(and(eq(staffCustomRoles.membershipId, m.id), isNull(customRoles.archivedAt)));
    const [settings] = await tx.select({ sport: academySettings.sport }).from(academySettings);
    return { membershipId: m.id, roles: rows.map((r) => r.role), custom, sport: settings?.sport ?? ("football" as SportId) };
  });
  if (!found) throw new AppError(409, "no_academy", "Pilih atau buat akademi dulu.");
  const perms = permissionsFor(found.roles, found.custom.map((c) => c.permissions));
  return {
    session,
    userId: session.userId,
    businessId,
    membershipId: found.membershipId,
    sport: found.sport,
    roles: found.roles,
    customRoleNames: found.custom.map((c) => c.name),
    can: (p) => perms.has(p),
  };
}

export function requirePermission(ctx: AcademyContext, p: Permission): void {
  if (!ctx.can(p)) throw forbidden();
}

/** Transaksi dengan RLS terisi untuk akademi aktif. Semua query data akademi lewat sini. */
export function inAcademy<T>(ctx: AcademyContext, work: (tx: Tx) => Promise<T>): Promise<T> {
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
}
