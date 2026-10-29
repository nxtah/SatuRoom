import "server-only";
import { setActiveBusiness, type SessionInfo } from "@saturoom/core/auth";
import { withContext } from "@saturoom/core/db";
import { auditEvents, businesses, memberships } from "@saturoom/core/schema";
import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { SettingsInput, VenueInput } from "@/lib/schemas";
import { inVenue, PRODUCT, requirePermission, type VenueContext } from "./context";
import { db } from "./db";
import { notFound } from "./errors";
import { mjTables, staffRoles, venueSettings } from "./schema";

/** Meja awal supaya lantai langsung terisi: pemilik tinggal mengubah nama dan tarif. */
const STARTER_TABLES = [
  { name: "Meja 1", kind: "auto" as const, ratePerHour: 40_000 },
  { name: "Meja 2", kind: "auto" as const, ratePerHour: 40_000 },
  { name: "Meja 3", kind: "manual" as const, ratePerHour: 30_000 },
  { name: "VIP", kind: "vip" as const, ratePerHour: 75_000 },
];

/** Membuat tempat baru dengan pembuatnya sebagai Pemilik, pengaturan bawaan, dan empat meja contoh. */
export async function createVenue(session: SessionInfo, input: z.infer<typeof VenueInput>): Promise<string> {
  const businessId = randomUUID();
  await withContext(db(), { userId: session.userId, businessId }, async (tx) => {
    await tx.insert(businesses).values({ id: businessId, product: PRODUCT, name: input.name, city: input.city, createdBy: session.userId });
    const [m] = await tx.insert(memberships).values({ businessId, userId: session.userId }).returning({ id: memberships.id });
    await tx.insert(staffRoles).values({ businessId, membershipId: m!.id, role: "owner" });
    await tx.insert(venueSettings).values({ businessId });
    await tx.insert(mjTables).values(STARTER_TABLES.map((t, i) => ({ ...t, businessId, seats: 4, sortOrder: i })));
    await tx.insert(auditEvents).values({ businessId, actorUserId: session.userId, action: "venue.created", targetType: "venue", targetId: businessId });
  });
  await setActiveBusiness(db(), session.sessionId, businessId);
  return businessId;
}

export interface VenueSummary {
  id: string;
  name: string;
  city: string | null;
  /** ID bisnis untuk masuk dan untuk link booking publik (8 karakter). */
  code: string;
}

export function listMyVenues(userId: string): Promise<VenueSummary[]> {
  return withContext(db(), { userId }, (tx) =>
    tx
      .select({ id: businesses.id, name: businesses.name, city: businesses.city, code: businesses.code })
      .from(businesses)
      .innerJoin(memberships, eq(memberships.businessId, businesses.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.status, "active"), eq(businesses.product, PRODUCT)))
      .orderBy(asc(businesses.name)),
  );
}

export async function switchVenue(session: SessionInfo, businessId: string): Promise<void> {
  if (!(await listMyVenues(session.userId)).some((v) => v.id === businessId)) throw notFound("Tempat");
  await setActiveBusiness(db(), session.sessionId, businessId);
}

export interface VenueSettings {
  billingStepMin: number;
  minMinutes: number;
  openTime: string;
  closeTime: string;
  discountSilver: number;
  discountGold: number;
  publicBooking: boolean;
}

export interface VenueProfile extends VenueSummary {
  timezone: string;
  settings: VenueSettings;
}

const hhmm = (t: string) => t.slice(0, 5);

export function getVenue(ctx: VenueContext): Promise<VenueProfile> {
  return inVenue(ctx, async (tx) => {
    const [b] = await tx
      .select({ id: businesses.id, name: businesses.name, city: businesses.city, code: businesses.code, timezone: businesses.timezone })
      .from(businesses)
      .where(eq(businesses.id, ctx.businessId));
    if (!b) throw notFound("Tempat");
    const [s] = await tx.select().from(venueSettings);
    return {
      ...b,
      settings: {
        billingStepMin: s?.billingStepMin ?? 30,
        minMinutes: s?.minMinutes ?? 60,
        openTime: hhmm(s?.openTime ?? "10:00"),
        closeTime: hhmm(s?.closeTime ?? "23:00"),
        discountSilver: s?.discountSilver ?? 5,
        discountGold: s?.discountGold ?? 10,
        publicBooking: s?.publicBooking ?? true,
      },
    };
  });
}

export async function updateVenue(ctx: VenueContext, profile: z.infer<typeof VenueInput>, settings: z.infer<typeof SettingsInput>): Promise<void> {
  requirePermission(ctx, "settings.manage");
  await inVenue(ctx, async (tx) => {
    await tx.update(businesses).set({ name: profile.name, city: profile.city }).where(eq(businesses.id, ctx.businessId));
    await tx
      .insert(venueSettings)
      .values({ businessId: ctx.businessId, ...settings })
      .onConflictDoUpdate({ target: venueSettings.businessId, set: { ...settings, updatedAt: new Date() } });
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "venue.updated", targetType: "venue", targetId: ctx.businessId });
  });
}
