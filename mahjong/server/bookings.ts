import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { BookingInput, PublicBookingInput } from "@/lib/schemas";
import { db } from "./db";
import { inVenue, requirePermission, type VenueContext } from "./context";
import { AppError, notFound } from "./errors";

export type BookingStatus = "requested" | "booked" | "arrived" | "cancelled" | "no_show";

export interface BookingRow {
  id: string;
  name: string;
  phone: string | null;
  memberName: string | null;
  tableId: string | null;
  tableName: string | null;
  date: string;
  startTime: string;
  endTime: string;
  startsAt: string;
  pax: number;
  status: BookingStatus;
  source: "staff" | "public";
  deposit: number;
  note: string | null;
  sessionId: string | null;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Menunggu meja",
  booked: "Dipesan",
  arrived: "Sudah datang",
  cancelled: "Batal",
  no_show: "Tidak datang",
};

/** Booking dalam rentang tanggal (zona waktu tempat), urut jam. */
export function listBookings(ctx: VenueContext, from: string, to: string): Promise<BookingRow[]> {
  requirePermission(ctx, "bookings.manage");
  return inVenue(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT k.id, k.name, k.phone, m.full_name AS "memberName", k.table_id AS "tableId", t.name AS "tableName",
        to_char(k.starts_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date,
        to_char(k.starts_at AT TIME ZONE b.timezone, 'HH24:MI') AS "startTime",
        to_char(k.ends_at AT TIME ZONE b.timezone, 'HH24:MI') AS "endTime",
        k.starts_at AS "startsAt", k.pax, k.status, k.source, k.deposit, k.note, k.session_id AS "sessionId"
      FROM mahjong.bookings k
      JOIN core.businesses b ON b.id = k.business_id
      LEFT JOIN mahjong.mj_tables t ON t.id = k.table_id
      LEFT JOIN mahjong.members m ON m.id = k.member_id
      WHERE (k.starts_at AT TIME ZONE b.timezone)::date BETWEEN ${from}::date AND ${to}::date
      ORDER BY k.starts_at, k.name`)) as unknown as BookingRow[],
  );
}

/** Jumlah permintaan publik yang menunggu meja. */
export function pendingRequests(ctx: VenueContext): Promise<number> {
  return inVenue(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`SELECT count(*)::int AS n FROM mahjong.bookings WHERE status = 'requested' AND ends_at > now()`)) as unknown as { n: number }[];
    return r!.n;
  });
}

type Tx = Parameters<Parameters<typeof inVenue>[1]>[0];

async function assertFree(tx: Tx, tableId: string, startsAt: string, endsAt: string, exceptId?: string) {
  const [t] = (await tx.execute(sql`SELECT is_maintenance AS maint, seats FROM mahjong.mj_tables WHERE id = ${tableId}::uuid AND archived_at IS NULL FOR UPDATE`)) as unknown as { maint: boolean; seats: number }[];
  if (!t) throw notFound("Meja");
  const [c] = (await tx.execute(sql`
    SELECT k.name, to_char(k.starts_at AT TIME ZONE b.timezone, 'HH24:MI') AS s, to_char(k.ends_at AT TIME ZONE b.timezone, 'HH24:MI') AS e
    FROM mahjong.bookings k JOIN core.businesses b ON b.id = k.business_id
    WHERE k.table_id = ${tableId}::uuid AND k.status IN ('booked', 'arrived') AND k.starts_at < ${endsAt}::timestamptz AND k.ends_at > ${startsAt}::timestamptz
      ${exceptId ? sql`AND k.id <> ${exceptId}::uuid` : sql``} LIMIT 1`)) as unknown as { name: string; s: string; e: string }[];
  if (c) throw new AppError(409, "clash", `Meja ini sudah dipesan ${c.name} pukul ${c.s}-${c.e}. Pilih jam atau meja lain.`);
  return t;
}

const toUtc = (tx: Tx, date: string, time: string, tz: string) =>
  tx.execute(sql`SELECT to_char((${`${date} ${time}`}::timestamp AT TIME ZONE ${tz}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS t`) as unknown as Promise<{ t: string }[]>;

export async function createBooking(ctx: VenueContext, input: z.infer<typeof BookingInput>): Promise<string> {
  requirePermission(ctx, "bookings.manage");
  if (!input.tableId) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { tableId: "Pilih meja." });
  return inVenue(ctx, async (tx) => {
    const [b] = (await tx.execute(sql`SELECT timezone FROM core.businesses WHERE id = ${ctx.businessId}::uuid`)) as unknown as { timezone: string }[];
    const [start] = await toUtc(tx, input.date, input.startTime, b!.timezone);
    const end = { t: new Date(new Date(start!.t).getTime() + input.durationMin * 60_000).toISOString() };
    if (new Date(end.t) < new Date()) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { date: "Waktu booking sudah lewat." });
    const table = await assertFree(tx, input.tableId!, start!.t, end.t);
    if (table.maint) throw new AppError(409, "maintenance", "Meja ini sedang dalam perawatan.");
    if (input.pax > table.seats) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { pax: `Meja ini hanya ${table.seats} kursi.` });
    const [row] = (await tx.execute(sql`
      INSERT INTO mahjong.bookings (business_id, table_id, member_id, name, phone, starts_at, ends_at, pax, status, deposit, note, created_by)
      VALUES (${ctx.businessId}::uuid, ${input.tableId}::uuid, ${input.memberId ?? null}::uuid, ${input.name}, ${input.phone}, ${start!.t}::timestamptz, ${end.t}::timestamptz,
              ${input.pax}, 'booked', ${input.deposit ?? 0}, ${input.note ?? null}, ${ctx.userId}::uuid) RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "booking.created", targetType: "booking", targetId: row!.id });
    return row!.id;
  });
}

/** Memberi meja pada permintaan dari link publik; setelah itu booking resmi dipegang. */
export async function assignBooking(ctx: VenueContext, id: string, tableId: string): Promise<void> {
  requirePermission(ctx, "bookings.manage");
  await inVenue(ctx, async (tx) => {
    const [k] = (await tx.execute(sql`SELECT status, starts_at AS s, ends_at AS e, pax FROM mahjong.bookings WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { status: BookingStatus; s: string; e: string; pax: number }[];
    if (!k) throw notFound("Booking");
    if (k.status !== "requested" && k.status !== "booked") throw new AppError(409, "closed", "Booking ini sudah selesai.");
    const table = await assertFree(tx, tableId, new Date(k.s).toISOString(), new Date(k.e).toISOString(), id);
    if (table.maint) throw new AppError(409, "maintenance", "Meja ini sedang dalam perawatan.");
    if (k.pax > table.seats) throw new AppError(409, "seats", `Meja ini hanya ${table.seats} kursi.`);
    await tx.execute(sql`UPDATE mahjong.bookings SET table_id = ${tableId}::uuid, status = 'booked' WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "booking.assigned", targetType: "booking", targetId: id });
  });
}

export async function setBookingStatus(ctx: VenueContext, id: string, status: "cancelled" | "no_show"): Promise<void> {
  requirePermission(ctx, "bookings.manage");
  await inVenue(ctx, async (tx) => {
    const done = (await tx.execute(sql`
      UPDATE mahjong.bookings SET status = ${status} WHERE id = ${id}::uuid AND status IN ('requested', 'booked') RETURNING id`)) as unknown as unknown[];
    if (!done.length) throw new AppError(409, "closed", "Booking ini sudah tidak bisa diubah.");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: `booking.${status}`, targetType: "booking", targetId: id });
  });
}

// ---------- Booking publik (tanpa login) ----------

export interface PublicVenue {
  name: string;
  city: string | null;
  openTime: string;
  closeTime: string;
  timezone: string;
}

export async function publicVenue(code: string): Promise<PublicVenue | null> {
  const rows = (await db().execute(sql`SELECT venue_name AS name, city, open_time AS "openTime", close_time AS "closeTime", timezone FROM mahjong.venue_public(${code})`)) as unknown as PublicVenue[];
  return rows[0] ?? null;
}

export async function submitPublicBooking(code: string, input: z.infer<typeof PublicBookingInput>): Promise<"created" | "duplicate"> {
  const venue = await publicVenue(code);
  if (!venue) throw new AppError(404, "closed", "Link booking ini tidak aktif.");
  const [t] = (await db().execute(sql`SELECT (${`${input.date} ${input.startTime}`}::timestamp AT TIME ZONE ${venue.timezone}) AS t`)) as unknown as { t: Date }[];
  const [res] = (await db().execute(sql`
    SELECT mahjong.submit_booking(${code}, ${input.name}, ${input.phone}, ${new Date(t!.t).toISOString()}::timestamptz, ${input.durationMin}, ${input.pax}, ${input.note ?? null}) AS r`)) as unknown as { r: string }[];
  switch (res?.r) {
    case "created": return "created";
    case "duplicate": return "duplicate";
    case "full": throw new AppError(429, "full", "Permintaan booking sedang penuh. Hubungi tempatnya langsung.");
    case "invalid": throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { date: "Pilih waktu di masa depan, paling jauh 60 hari." });
    default: throw new AppError(404, "closed", "Link booking ini tidak aktif.");
  }
}
