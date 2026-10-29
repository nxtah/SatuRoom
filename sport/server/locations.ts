import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { LocationInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { locations } from "./schema";

export interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  isPrimary: boolean;
  /** Sesi mendatang yang memakai lokasi ini (belum dibatalkan). */
  upcoming: number;
}

/** Lokasi aktif akademi, utama lebih dulu. Semua staf boleh melihat (dipakai di form jadwal). */
export function listLocations(ctx: AcademyContext): Promise<LocationRow[]> {
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT l.id, l.name, l.address, l.is_primary AS "isPrimary",
             (SELECT count(*)::int FROM bola.sessions s
               WHERE s.location_id = l.id AND s.status = 'scheduled' AND s.ends_at > now()) AS upcoming
      FROM bola.locations l WHERE l.archived_at IS NULL
      ORDER BY l.is_primary DESC, l.name`)) as unknown as LocationRow[],
  );
}

const clash = (error: unknown) =>
  typeof error === "object" && error !== null && "cause" in error && (error.cause as { code?: string })?.code === "23505";

export async function createLocation(ctx: AcademyContext, input: z.infer<typeof LocationInput>): Promise<string> {
  requirePermission(ctx, "locations.manage");
  try {
    return await inAcademy(ctx, async (tx) => {
      const [row] = await tx
        .insert(locations)
        .values({ businessId: ctx.businessId, name: input.name, address: input.address ?? null })
        .returning({ id: locations.id });
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "location.created", targetType: "location", targetId: row!.id });
      return row!.id;
    });
  } catch (e) {
    if (clash(e)) throw new AppError(409, "duplicate", "Nama lokasi ini sudah dipakai.", { name: "Nama lokasi ini sudah dipakai." });
    throw e;
  }
}

export async function updateLocation(ctx: AcademyContext, id: string, input: z.infer<typeof LocationInput>): Promise<void> {
  requirePermission(ctx, "locations.manage");
  try {
    await inAcademy(ctx, async (tx) => {
      const updated = await tx
        .update(locations)
        .set({ name: input.name, address: input.address ?? null })
        .where(and(eq(locations.id, id), isNull(locations.archivedAt)))
        .returning({ id: locations.id });
      if (updated.length === 0) throw notFound("Lokasi");
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "location.updated", targetType: "location", targetId: id });
    });
  } catch (e) {
    if (clash(e)) throw new AppError(409, "duplicate", "Nama lokasi ini sudah dipakai.", { name: "Nama lokasi ini sudah dipakai." });
    throw e;
  }
}

/** Mengarsipkan lokasi. Lokasi utama dan lokasi yang masih dipakai jadwal mendatang tidak bisa diarsipkan. */
export async function archiveLocation(ctx: AcademyContext, id: string): Promise<void> {
  requirePermission(ctx, "locations.manage");
  await inAcademy(ctx, async (tx) => {
    const [loc] = await tx.select().from(locations).where(and(eq(locations.id, id), isNull(locations.archivedAt)));
    if (!loc) throw notFound("Lokasi");
    if (loc.isPrimary) throw new AppError(409, "primary", "Lokasi utama tidak bisa diarsipkan.");
    const [used] = (await tx.execute(sql`
      SELECT (EXISTS (SELECT 1 FROM bola.sessions s WHERE s.location_id = ${id}::uuid AND s.status = 'scheduled' AND s.ends_at > now())
           OR EXISTS (SELECT 1 FROM bola.schedules x WHERE x.location_id = ${id}::uuid AND (x.ends_on IS NULL OR x.ends_on >= current_date))) AS used`)) as unknown as { used: boolean }[];
    if (used?.used) throw new AppError(409, "in_use", "Lokasi ini masih dipakai jadwal. Pindahkan atau hentikan jadwalnya dulu.");
    await tx.update(locations).set({ archivedAt: new Date() }).where(eq(locations.id, id));
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "location.archived", targetType: "location", targetId: id });
  });
}

