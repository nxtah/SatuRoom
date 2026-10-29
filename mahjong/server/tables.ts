import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { TableInput } from "@/lib/schemas";
import { inVenue, requirePermission, type VenueContext } from "./context";
import { AppError, notFound } from "./errors";
import { mjTables } from "./schema";

export interface TableRow {
  id: string;
  name: string;
  kind: "auto" | "manual" | "vip";
  seats: number;
  ratePerHour: number;
  isMaintenance: boolean;
}

export { KIND_LABEL } from "@/lib/billing";

export function listTables(ctx: VenueContext): Promise<TableRow[]> {
  return inVenue(ctx, (tx) =>
    tx
      .select({ id: mjTables.id, name: mjTables.name, kind: mjTables.kind, seats: mjTables.seats, ratePerHour: mjTables.ratePerHour, isMaintenance: mjTables.isMaintenance })
      .from(mjTables)
      .where(isNull(mjTables.archivedAt))
      .orderBy(asc(mjTables.sortOrder), asc(mjTables.name)),
  );
}

const duplicate = (e: unknown) => typeof e === "object" && e !== null && "cause" in e && (e.cause as { code?: string })?.code === "23505";
const nameTaken = () => new AppError(409, "duplicate", "Nama meja ini sudah dipakai.", { name: "Nama meja ini sudah dipakai." });

export async function createTable(ctx: VenueContext, input: z.infer<typeof TableInput>): Promise<string> {
  requirePermission(ctx, "tables.manage");
  try {
    return await inVenue(ctx, async (tx) => {
      const [{ n } = { n: 0 }] = await tx.select({ n: sql<number>`coalesce(max(${mjTables.sortOrder}), -1) + 1` }).from(mjTables);
      const [row] = await tx
        .insert(mjTables)
        .values({ businessId: ctx.businessId, ...input, isMaintenance: input.isMaintenance ?? false, sortOrder: n })
        .returning({ id: mjTables.id });
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "table.created", targetType: "table", targetId: row!.id });
      return row!.id;
    });
  } catch (e) {
    if (duplicate(e)) throw nameTaken();
    throw e;
  }
}

export async function updateTable(ctx: VenueContext, id: string, input: z.infer<typeof TableInput>): Promise<void> {
  requirePermission(ctx, "tables.manage");
  try {
    await inVenue(ctx, async (tx) => {
      if (input.isMaintenance) await assertNoOpenSession(tx, id, "Selesaikan sesi di meja ini dulu sebelum menandainya perawatan.");
      const done = await tx
        .update(mjTables)
        .set({ ...input, isMaintenance: input.isMaintenance ?? false })
        .where(and(eq(mjTables.id, id), isNull(mjTables.archivedAt)))
        .returning({ id: mjTables.id });
      if (!done.length) throw notFound("Meja");
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "table.updated", targetType: "table", targetId: id });
    });
  } catch (e) {
    if (duplicate(e)) throw nameTaken();
    throw e;
  }
}

async function assertNoOpenSession(tx: Parameters<Parameters<typeof inVenue>[1]>[0], tableId: string, message: string) {
  const [row] = (await tx.execute(sql`SELECT 1 AS x FROM mahjong.play_sessions WHERE table_id = ${tableId}::uuid AND status = 'open'`)) as unknown as { x: number }[];
  if (row) throw new AppError(409, "in_use", message);
}

/** Mengarsipkan meja; meja yang sedang dipakai atau sudah dipesan tidak bisa diarsipkan. */
export async function archiveTable(ctx: VenueContext, id: string): Promise<void> {
  requirePermission(ctx, "tables.manage");
  await inVenue(ctx, async (tx) => {
    await assertNoOpenSession(tx, id, "Meja ini sedang dipakai. Tutup sesinya dulu.");
    const [b] = (await tx.execute(sql`
      SELECT 1 AS x FROM mahjong.bookings WHERE table_id = ${id}::uuid AND status = 'booked' AND ends_at > now()`)) as unknown as { x: number }[];
    if (b) throw new AppError(409, "booked", "Meja ini masih punya booking mendatang. Pindahkan atau batalkan dulu.");
    const done = await tx.update(mjTables).set({ archivedAt: new Date() }).where(and(eq(mjTables.id, id), isNull(mjTables.archivedAt))).returning({ id: mjTables.id });
    if (!done.length) throw notFound("Meja");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "table.archived", targetType: "table", targetId: id });
  });
}

export type FloorStatus = "free" | "playing" | "reserved" | "maintenance";

export interface FloorTable extends TableRow {
  status: FloorStatus;
  session: null | {
    id: string;
    startedAt: string;
    players: number;
    label: string;
    memberTier: "regular" | "silver" | "gold" | null;
    step: number;
    minMinutes: number;
    rate: number;
    fnb: number;
    discountPct: number;
  };
  /** Booking terdekat untuk meja kosong (dalam 3 jam ke depan). */
  nextBooking: null | { id: string; name: string; startsAt: string; pax: number; status: "booked" | "arrived" };
}

/** Papan lantai: semua meja aktif dengan sesi berjalan dan booking terdekat. */
export function floorBoard(ctx: VenueContext): Promise<{ tables: FloorTable[]; serverNow: string }> {
  return inVenue(ctx, async (tx) => {
    const tables = (await tx.execute(sql`
      SELECT t.id, t.name, t.kind, t.seats, t.rate_per_hour AS "ratePerHour", t.is_maintenance AS "isMaintenance",
        CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
          'id', s.id, 'startedAt', s.started_at, 'players', s.players,
          'label', coalesce(m.full_name, s.guest_name, 'Tamu'), 'memberTier', m.tier,
          'step', s.step_min, 'minMinutes', s.min_minutes, 'rate', s.rate_per_hour,
          'fnb', coalesce((SELECT sum(o.unit_price * o.qty) FROM mahjong.session_orders o WHERE o.session_id = s.id AND o.status <> 'void'), 0),
          'discountPct', CASE m.tier WHEN 'gold' THEN st.discount_gold WHEN 'silver' THEN st.discount_silver ELSE 0 END
        ) END AS session,
        CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('id', b.id, 'name', b.name, 'startsAt', b.starts_at, 'pax', b.pax, 'status', b.status) END AS "nextBooking"
      FROM mahjong.mj_tables t
      LEFT JOIN mahjong.play_sessions s ON s.table_id = t.id AND s.status = 'open'
      LEFT JOIN mahjong.members m ON m.id = s.member_id
      LEFT JOIN mahjong.venue_settings st ON st.business_id = t.business_id
      LEFT JOIN LATERAL (
        SELECT id, name, starts_at, pax, status FROM mahjong.bookings bk
        WHERE bk.table_id = t.id AND bk.status = 'booked' AND bk.ends_at > now() AND bk.starts_at < now() + interval '3 hours'
        ORDER BY bk.starts_at LIMIT 1) b ON true
      WHERE t.archived_at IS NULL
      ORDER BY t.sort_order, t.name`)) as unknown as (TableRow & { session: FloorTable["session"]; nextBooking: FloorTable["nextBooking"] })[];
    const board: FloorTable[] = tables.map((t) => {
      const soon = t.nextBooking && new Date(t.nextBooking.startsAt).getTime() - Date.now() < 60 * 60_000;
      const status: FloorStatus = t.isMaintenance ? "maintenance" : t.session ? "playing" : soon ? "reserved" : "free";
      return { ...t, status };
    });
    return { tables: board, serverNow: new Date().toISOString() };
  });
}
