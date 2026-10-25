import "server-only";
import { setActiveBusiness, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { auditEvents, businesses, memberships } from "@saturoom/core/schema";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { AcademyInput } from "@/lib/schemas";
import { inAcademy, PRODUCT, requirePermission, type AcademyContext } from "./context";
import { db } from "./db";
import { forbidden, notFound } from "./errors";
import { locations, onboarding, staffRoles } from "./schema";

export type AcademyInput = z.infer<typeof AcademyInput>;

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
    await tx.insert(locations).values({ businessId, name: "Lapangan utama", isPrimary: true });
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
}

/** Akademi tempat pengguna menjadi anggota aktif (RLS memastikan hanya miliknya yang terbaca). */
export function listMyAcademies(userId: string): Promise<AcademySummary[]> {
  return withContext(db(), { userId }, (tx) =>
    tx
      .select({ id: businesses.id, name: businesses.name, city: businesses.city })
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
}

export function getAcademy(ctx: AcademyContext): Promise<AcademyProfile> {
  return inAcademy(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: businesses.id, name: businesses.name, city: businesses.city, timezone: businesses.timezone })
      .from(businesses)
      .where(eq(businesses.id, ctx.businessId));
    if (!row) throw notFound("Akademi");
    return row;
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
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "academy.updated",
      targetType: "academy",
      targetId: ctx.businessId,
    });
  });
}
