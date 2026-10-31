import "server-only";
import { setActiveBusiness, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { auditEvents, businesses, memberships } from "@saturoom/core/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { AcademyInput } from "@/lib/schemas";
import { inAcademy, PRODUCT, requirePermission, type AcademyContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { sportOf, type SportId } from "@/lib/sports";
import { cleanImageUrl } from "./cloudinary";
import { academySettings, branches, locations, onboarding, players, staffRoles } from "./schema";

export type AcademyInput = z.input<typeof AcademyInput>;

/**
 * Membuat akademi baru dengan pembuatnya sebagai Pemilik, satu lokasi utama, dan catatan onboarding.
 * Semua dalam satu transaksi: gagal di tengah berarti tidak ada yang tersimpan.
 */
export async function createAcademy(session: SessionInfo, input: AcademyInput): Promise<string> {
  const businessId = randomUUID();
  await withContext(db(), { userId: session.userId, businessId }, async (tx) => {
    await tx.insert(businesses).values({
      id: businessId,
      product: PRODUCT,
      name: input.name,
      city: input.city,
      createdBy: session.userId,
    });
    const [m] = await tx
      .insert(memberships)
      .values({ businessId, userId: session.userId })
      .returning({ id: memberships.id });
    await tx.insert(staffRoles).values({ businessId, membershipId: m!.id, role: "owner" });
    await tx.insert(academySettings).values({ businessId, sport: input.sport ?? "football" });
    await tx.execute(sql`SELECT bola.seed_accounts(${businessId}::uuid)`);
    const [branch] = await tx.insert(branches).values({ businessId, name: "Cabang utama", isPrimary: true }).returning({ id: branches.id });
    await tx.insert(locations).values({ businessId, branchId: branch!.id, name: sportOf(input.sport ?? "football").venueDefault, isPrimary: true });
    await tx.insert(onboarding).values({ businessId });
    await tx.insert(auditEvents).values({
      businessId,
      actorUserId: session.userId,
      action: "academy.created",
      targetType: "academy",
      targetId: businessId,
    });
  });
  await setActiveBusiness(db(), session.sessionId, businessId);
  return businessId;
}

export interface AcademySummary {
  id: string;
  name: string;
  city: string | null;
  /** ID bisnis untuk masuk (8 karakter). */
  code: string;
}

/** Akademi tempat pengguna menjadi anggota aktif (RLS memastikan hanya miliknya yang terbaca). */
export function listMyAcademies(userId: string): Promise<AcademySummary[]> {
  return withContext(db(), { userId }, (tx) =>
    tx
      .select({ id: businesses.id, name: businesses.name, city: businesses.city, code: businesses.code })
      .from(businesses)
      .innerJoin(memberships, eq(memberships.businessId, businesses.id))
      .where(
        and(eq(memberships.userId, userId), eq(memberships.status, "active"), eq(businesses.product, PRODUCT)),
      )
      .orderBy(asc(businesses.name)),
  );
}

/** Mengganti akademi aktif. Id dari browser hanya diterima bila pengguna anggota aktif di sana. */
export async function switchAcademy(session: SessionInfo, businessId: string): Promise<void> {
  const mine = await listMyAcademies(session.userId);
  if (!mine.some((a) => a.id === businessId)) throw notFound("Akademi");
  await setActiveBusiness(db(), session.sessionId, businessId);
}

export interface AcademyProfile extends AcademySummary {
  timezone: string;
  sport: SportId;
  /** Cabang masih bisa diganti selama belum ada pemain (posisi pemain mengikuti cabang). */
  sportLocked: boolean;
  logoUrl: string | null;
  address: string | null;
}

export function getAcademy(ctx: AcademyContext): Promise<AcademyProfile> {
  return inAcademy(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: businesses.id, name: businesses.name, city: businesses.city, code: businesses.code, timezone: businesses.timezone })
      .from(businesses)
      .where(eq(businesses.id, ctx.businessId));
    if (!row) throw notFound("Akademi");
    const [anyPlayer] = await tx.select({ id: players.id }).from(players).limit(1);
    const [settings] = await tx
      .select({ sport: academySettings.sport, logoUrl: academySettings.logoUrl, address: academySettings.address })
      .from(academySettings);
    return {
      ...row,
      sport: settings?.sport ?? ctx.sport,
      sportLocked: Boolean(anyPlayer),
      logoUrl: settings?.logoUrl ?? null,
      address: settings?.address ?? null,
    };
  });
}

export async function updateAcademy(ctx: AcademyContext, input: AcademyInput): Promise<void> {
  requirePermission(ctx, "academy.update");
  await inAcademy(ctx, async (tx) => {
    const updated = await tx
      .update(businesses)
      .set({ name: input.name, city: input.city, updatedAt: new Date() })
      .where(eq(businesses.id, ctx.businessId))
      .returning({ id: businesses.id });
    if (updated.length === 0) throw forbidden();
    if (input.address !== undefined) {
      await tx
        .update(academySettings)
        .set({ address: input.address || null, updatedAt: new Date() })
        .where(eq(academySettings.businessId, ctx.businessId));
    }
    if (input.sport && input.sport !== ctx.sport) {
      // Posisi pemain mengikuti cabang, jadi cabang hanya bisa diganti selama belum ada pemain.
      const [anyPlayer] = await tx.select({ id: players.id }).from(players).limit(1);
      if (anyPlayer) throw new AppError(409, "sport_locked", "Cabang olahraga tidak bisa diganti setelah ada pemain.");
      await tx.update(academySettings).set({ sport: input.sport, updatedAt: new Date() }).where(eq(academySettings.businessId, ctx.businessId));
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "academy.updated",
      targetType: "academy",
      targetId: ctx.businessId,
    });
  });
}

/** Memasang atau menghapus logo akademi. URL hanya diterima dari folder Cloudinary akademi ini. */
export async function setAcademyLogo(ctx: AcademyContext, url: string | null): Promise<void> {
  requirePermission(ctx, "academy.update");
  const logoUrl = cleanImageUrl(ctx, url);
  await inAcademy(ctx, async (tx) => {
    await tx.update(academySettings).set({ logoUrl, updatedAt: new Date() }).where(eq(academySettings.businessId, ctx.businessId));
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: logoUrl ? "academy.logo_set" : "academy.logo_removed",
      targetType: "academy",
      targetId: ctx.businessId,
    });
  });
}
