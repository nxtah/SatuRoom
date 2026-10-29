import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import type { Tx } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import { computeBill, discountFor, type Bill, type Method, type Tier } from "@/lib/billing";
import type { CloseSessionInput, OpenSessionInput, OrderInput, SessionPatchInput } from "@/lib/schemas";
import { inVenue, requirePermission, type VenueContext } from "./context";
import { AppError, notFound } from "./errors";

export interface OrderRow {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
  status: "new" | "served" | "void";
  at: string;
}

export interface PaymentRow {
  id: string;
  method: Method;
  amount: number;
}

export interface SessionDetail {
  id: string;
  status: "open" | "closed" | "void";
  tableId: string;
  tableName: string;
  startedAt: string;
  endedAt: string | null;
  players: number;
  memberId: string | null;
  memberName: string | null;
  memberTier: Tier | null;
  memberBalance: number;
  guestName: string | null;
  rate: number;
  step: number;
  minMinutes: number;
  discountPct: number;
  orders: OrderRow[];
  payments: PaymentRow[];
  /** Tagihan: berjalan (sesi terbuka) atau final (sesi tertutup). */
  bill: Bill;
  bookingId: string | null;
  serverNow: string;
  timezone: string;
}

interface SessionBase {
  id: string; status: SessionDetail["status"]; tableId: string; tableName: string; startedAt: string; endedAt: string | null;
  players: number; memberId: string | null; memberName: string | null; memberTier: Tier | null; memberBalance: number; guestName: string | null;
  rate: number; step: number; minMinutes: number; discountSnapshot: number; discountSilver: number; discountGold: number;
  timeCharge: number | null; fnbTotal: number | null; discountAmount: number | null; total: number | null; bookingId: string | null; timezone: string;
}

async function loadBase(tx: Tx, id: string, lock = false): Promise<SessionBase> {
  const [row] = (await tx.execute(sql`
    SELECT s.id, s.status, s.table_id AS "tableId", t.name AS "tableName", s.started_at AS "startedAt", s.ended_at AS "endedAt",
      s.players, s.member_id AS "memberId", m.full_name AS "memberName", m.tier AS "memberTier",
      coalesce((SELECT sum(l.amount) FROM mahjong.member_ledger l WHERE l.member_id = s.member_id), 0)::int AS "memberBalance",
      s.guest_name AS "guestName", s.rate_per_hour AS rate, s.step_min AS step, s.min_minutes AS "minMinutes", s.discount_pct AS "discountSnapshot",
      st.discount_silver AS "discountSilver", st.discount_gold AS "discountGold",
      s.time_charge AS "timeCharge", s.fnb_total AS "fnbTotal", s.discount_amount AS "discountAmount", s.total, s.booking_id AS "bookingId", b.timezone
    FROM mahjong.play_sessions s
    JOIN mahjong.mj_tables t ON t.id = s.table_id
    JOIN core.businesses b ON b.id = s.business_id
    JOIN mahjong.venue_settings st ON st.business_id = s.business_id
    LEFT JOIN mahjong.members m ON m.id = s.member_id
    WHERE s.id = ${id}::uuid ${lock ? sql`FOR UPDATE OF s` : sql``}`)) as unknown as SessionBase[];
  if (!row) throw notFound("Sesi");
  return row;
}

const fnbOf = async (tx: Tx, id: string) => {
  const [r] = (await tx.execute(sql`SELECT coalesce(sum(unit_price * qty), 0)::int AS n FROM mahjong.session_orders WHERE session_id = ${id}::uuid AND status <> 'void'`)) as unknown as { n: number }[];
  return r!.n;
};

export function getSession(ctx: VenueContext, id: string): Promise<SessionDetail> {
  requirePermission(ctx, "floor.view");
  return inVenue(ctx, async (tx) => {
    const s = await loadBase(tx, id);
    const orders = (await tx.execute(sql`
      SELECT id, name, unit_price AS "unitPrice", qty, status, created_at AS at FROM mahjong.session_orders WHERE session_id = ${id}::uuid ORDER BY created_at`)) as unknown as OrderRow[];
    const payments = (await tx.execute(sql`SELECT id, method, amount FROM mahjong.payments WHERE session_id = ${id}::uuid ORDER BY created_at`)) as unknown as PaymentRow[];
    const fnb = s.status === "open" ? await fnbOf(tx, id) : (s.fnbTotal ?? 0);
    const discountPct = s.status === "open" ? (s.memberTier ? discountFor(s.memberTier, s) : 0) : s.discountSnapshot;
    const bill: Bill =
      s.status === "closed" && s.total !== null
        ? { elapsedMin: (+new Date(s.endedAt!) - +new Date(s.startedAt)) / 60_000, billableMin: 0, timeCharge: s.timeCharge!, discount: s.discountAmount!, fnb, total: s.total }
        : computeBill({ rate: s.rate, step: s.step, minMinutes: s.minMinutes, startedAt: s.startedAt, endedAt: s.endedAt ?? new Date(), fnb, discountPct });
    return {
      id: s.id, status: s.status, tableId: s.tableId, tableName: s.tableName, startedAt: new Date(s.startedAt).toISOString(),
      endedAt: s.endedAt ? new Date(s.endedAt).toISOString() : null, players: s.players, memberId: s.memberId, memberName: s.memberName,
      memberTier: s.memberTier, memberBalance: s.memberBalance, guestName: s.guestName, rate: s.rate, step: s.step, minMinutes: s.minMinutes,
      discountPct, orders, payments, bill, bookingId: s.bookingId, serverNow: new Date().toISOString(), timezone: s.timezone,
    };
  });
}

/** Membuka meja. Meja yang sedang dipakai, dirawat, atau akan dipakai pemesan lain ditolak. */
export async function openSession(ctx: VenueContext, input: z.infer<typeof OpenSessionInput>): Promise<string> {
  requirePermission(ctx, "sessions.run");
  return inVenue(ctx, async (tx) => {
    const [t] = (await tx.execute(sql`
      SELECT t.id, t.rate_per_hour AS rate, t.is_maintenance AS maint, t.seats, st.billing_step_min AS step, st.min_minutes AS min
      FROM mahjong.mj_tables t JOIN mahjong.venue_settings st ON st.business_id = t.business_id
      WHERE t.id = ${input.tableId}::uuid AND t.archived_at IS NULL FOR UPDATE OF t`)) as unknown as { id: string; rate: number; maint: boolean; seats: number; step: number; min: number }[];
    if (!t) throw notFound("Meja");
    if (t.maint) throw new AppError(409, "maintenance", "Meja ini sedang dalam perawatan.");
    if (input.players > t.seats) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { players: `Meja ini hanya ${t.seats} kursi.` });
    const [open] = (await tx.execute(sql`SELECT 1 AS x FROM mahjong.play_sessions WHERE table_id = ${t.id}::uuid AND status = 'open'`)) as unknown as unknown[];
    if (open) throw new AppError(409, "in_use", "Meja ini sedang dipakai.");

    let bookingId: string | null = null;
    let memberId = input.memberId ?? null;
    let guest = input.guestName ?? null;
    if (input.bookingId) {
      const [bk] = (await tx.execute(sql`
        SELECT id, table_id AS "tableId", status, name, member_id AS "memberId" FROM mahjong.bookings WHERE id = ${input.bookingId}::uuid FOR UPDATE`)) as unknown as { id: string; tableId: string | null; status: string; name: string; memberId: string | null }[];
      if (!bk || bk.status !== "booked") throw new AppError(409, "booking", "Booking ini tidak aktif lagi.");
      if (bk.tableId !== t.id) throw new AppError(409, "booking", "Booking ini untuk meja lain.");
      bookingId = bk.id;
      memberId ??= bk.memberId;
      if (!memberId) guest ??= bk.name;
    } else {
      // Tamu tanpa booking tidak boleh mengambil meja yang akan dipakai pemesan dalam satu jam.
      const [soon] = (await tx.execute(sql`
        SELECT bk.name, to_char(bk.starts_at AT TIME ZONE b.timezone, 'HH24:MI') AS at
        FROM mahjong.bookings bk JOIN core.businesses b ON b.id = bk.business_id
        WHERE bk.table_id = ${t.id}::uuid AND bk.status = 'booked' AND bk.starts_at < now() + interval '1 hour' AND bk.ends_at > now()
        ORDER BY bk.starts_at LIMIT 1`)) as unknown as { name: string; at: string }[];
      if (soon) throw new AppError(409, "reserved", `Meja ini dipesan ${soon.name} pukul ${soon.at}. Pilih meja lain atau buka lewat booking.`);
    }
    if (memberId) {
      const [m] = (await tx.execute(sql`SELECT 1 AS x FROM mahjong.members WHERE id = ${memberId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
      if (!m) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { memberId: "Member tidak ditemukan." });
    }
    const [row] = (await tx.execute(sql`
      INSERT INTO mahjong.play_sessions (business_id, table_id, member_id, guest_name, players, rate_per_hour, step_min, min_minutes, booking_id, opened_by)
      VALUES (${ctx.businessId}::uuid, ${t.id}::uuid, ${memberId}::uuid, ${guest}, ${input.players}, ${t.rate}, ${t.step}, ${t.min}, ${bookingId}::uuid, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    if (bookingId) await tx.execute(sql`UPDATE mahjong.bookings SET status = 'arrived', session_id = ${row!.id}::uuid WHERE id = ${bookingId}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "session.opened", targetType: "session", targetId: row!.id });
    return row!.id;
  });
}

/** Mencatat pesanan makanan atau minuman ke sesi yang berjalan; stok berkurang atomik. */
export async function addOrder(ctx: VenueContext, sessionId: string, input: z.infer<typeof OrderInput>): Promise<void> {
  requirePermission(ctx, "orders.add");
  await inVenue(ctx, async (tx) => {
    const s = await loadBase(tx, sessionId, true);
    if (s.status !== "open") throw new AppError(409, "closed", "Sesi ini sudah selesai.");
    const [item] = (await tx.execute(sql`
      UPDATE mahjong.menu_items SET stock = CASE WHEN stock IS NULL THEN NULL ELSE stock - ${input.qty} END
      WHERE id = ${input.menuItemId}::uuid AND archived_at IS NULL AND is_available AND (stock IS NULL OR stock >= ${input.qty})
      RETURNING id, name, price`)) as unknown as { id: string; name: string; price: number }[];
    if (!item) {
      const [exists] = (await tx.execute(sql`SELECT name, stock, is_available AS ok FROM mahjong.menu_items WHERE id = ${input.menuItemId}::uuid AND archived_at IS NULL`)) as unknown as { name: string; stock: number | null; ok: boolean }[];
      if (!exists) throw notFound("Menu");
      throw new AppError(409, "stock", exists.ok ? `Stok ${exists.name} tinggal ${exists.stock}.` : `${exists.name} sedang tidak tersedia.`);
    }
    await tx.execute(sql`
      INSERT INTO mahjong.session_orders (business_id, session_id, menu_item_id, name, unit_price, qty, created_by)
      VALUES (${ctx.businessId}::uuid, ${sessionId}::uuid, ${item.id}::uuid, ${item.name}, ${item.price}, ${input.qty}, ${ctx.userId}::uuid)`);
  });
}

/** Menandai pesanan sudah diantar atau membatalkannya (stok dikembalikan). */
export async function setOrderStatus(ctx: VenueContext, sessionId: string, orderId: string, status: "served" | "void"): Promise<void> {
  requirePermission(ctx, status === "void" ? "sessions.run" : "orders.add");
  await inVenue(ctx, async (tx) => {
    const s = await loadBase(tx, sessionId, true);
    if (s.status !== "open") throw new AppError(409, "closed", "Sesi ini sudah selesai.");
    const [o] = (await tx.execute(sql`SELECT id, menu_item_id AS "itemId", qty, status FROM mahjong.session_orders WHERE id = ${orderId}::uuid AND session_id = ${sessionId}::uuid FOR UPDATE`)) as unknown as { id: string; itemId: string | null; qty: number; status: string }[];
    if (!o) throw notFound("Pesanan");
    if (o.status === "void") throw new AppError(409, "void", "Pesanan ini sudah dibatalkan.");
    await tx.execute(sql`UPDATE mahjong.session_orders SET status = ${status} WHERE id = ${orderId}::uuid`);
    if (status === "void" && o.itemId) await tx.execute(sql`UPDATE mahjong.menu_items SET stock = stock + ${o.qty} WHERE id = ${o.itemId}::uuid AND stock IS NOT NULL`);
  });
}

/** Mengganti member atau nama tamu, jumlah pemain, atau memindahkan sesi ke meja lain yang kosong. */
export async function patchSession(ctx: VenueContext, id: string, input: z.infer<typeof SessionPatchInput>): Promise<void> {
  requirePermission(ctx, "sessions.run");
  await inVenue(ctx, async (tx) => {
    const s = await loadBase(tx, id, true);
    if (s.status !== "open") throw new AppError(409, "closed", "Sesi ini sudah selesai.");
    if (input.memberId !== undefined) {
      if (input.memberId) {
        const [m] = (await tx.execute(sql`SELECT 1 AS x FROM mahjong.members WHERE id = ${input.memberId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
        if (!m) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { memberId: "Member tidak ditemukan." });
      }
      await tx.execute(sql`UPDATE mahjong.play_sessions SET member_id = ${input.memberId}::uuid WHERE id = ${id}::uuid`);
    }
    if (input.guestName !== undefined) await tx.execute(sql`UPDATE mahjong.play_sessions SET guest_name = ${input.guestName} WHERE id = ${id}::uuid`);
    if (input.players !== undefined) await tx.execute(sql`UPDATE mahjong.play_sessions SET players = ${input.players} WHERE id = ${id}::uuid`);
    if (input.moveToTableId && input.moveToTableId !== s.tableId) {
      const [t] = (await tx.execute(sql`
        SELECT id, rate_per_hour AS rate, is_maintenance AS maint, seats FROM mahjong.mj_tables WHERE id = ${input.moveToTableId}::uuid AND archived_at IS NULL FOR UPDATE`)) as unknown as { id: string; rate: number; maint: boolean; seats: number }[];
      if (!t) throw notFound("Meja");
      if (t.maint) throw new AppError(409, "maintenance", "Meja tujuan sedang dalam perawatan.");
      if (s.players > t.seats) throw new AppError(409, "seats", `Meja tujuan hanya ${t.seats} kursi.`);
      const [busy] = (await tx.execute(sql`SELECT 1 AS x FROM mahjong.play_sessions WHERE table_id = ${t.id}::uuid AND status = 'open'`)) as unknown as unknown[];
      if (busy) throw new AppError(409, "in_use", "Meja tujuan sedang dipakai.");
      // Tarif mengikuti meja baru untuk seluruh sesi; layar pemindahan sudah memberi tahu hal ini.
      await tx.execute(sql`UPDATE mahjong.play_sessions SET table_id = ${t.id}::uuid, rate_per_hour = ${t.rate} WHERE id = ${id}::uuid`);
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "session.moved", targetType: "session", targetId: id });
    }
  });
}

export interface ClosedBill {
  bill: Bill;
  paid: number;
}

/** Menutup sesi: tagihan dikunci, pembayaran dicatat, dan saldo member dipotong bila dipakai. */
export async function closeSession(ctx: VenueContext, id: string, input: z.infer<typeof CloseSessionInput>): Promise<ClosedBill> {
  requirePermission(ctx, "sessions.run");
  return inVenue(ctx, async (tx) => {
    const s = await loadBase(tx, id, true);
    if (s.status !== "open") throw new AppError(409, "closed", "Sesi ini sudah selesai.");
    const fnb = await fnbOf(tx, id);
    const discountPct = s.memberTier ? discountFor(s.memberTier, s) : 0;
    const endedAt = new Date();
    const bill = computeBill({ rate: s.rate, step: s.step, minMinutes: s.minMinutes, startedAt: s.startedAt, endedAt, fnb, discountPct });
    const paid = input.payments.reduce((n, p) => n + p.amount, 0);
    if (paid !== bill.total) {
      throw new AppError(422, "payment_mismatch", bill.total === 0 ? "Tagihan Rp 0: tidak perlu pembayaran." : "Jumlah pembayaran harus sama dengan total tagihan.", {
        payments: `Total tagihan ${bill.total}, terisi ${paid}.`,
      });
    }
    const spend = input.payments.filter((p) => p.method === "balance").reduce((n, p) => n + p.amount, 0);
    if (spend > 0) {
      if (!s.memberId) throw new AppError(422, "invalid", "Saldo hanya bisa dipakai oleh member.", { payments: "Pilih member dulu untuk memakai saldo." });
      // Kunci baris member supaya dua penutupan bersamaan tidak membuat saldo minus.
      await tx.execute(sql`SELECT 1 FROM mahjong.members WHERE id = ${s.memberId}::uuid FOR UPDATE`);
      const [bal] = (await tx.execute(sql`SELECT coalesce(sum(amount), 0)::int AS n FROM mahjong.member_ledger WHERE member_id = ${s.memberId}::uuid`)) as unknown as { n: number }[];
      if (bal!.n < spend) throw new AppError(409, "insufficient_balance", `Saldo member tidak cukup (tersisa ${bal!.n}).`, { payments: "Saldo tidak cukup." });
      await tx.execute(sql`
        INSERT INTO mahjong.member_ledger (business_id, member_id, kind, amount, session_id, note, created_by)
        VALUES (${ctx.businessId}::uuid, ${s.memberId}::uuid, 'spend', ${-spend}, ${id}::uuid, ${`Sesi ${s.tableName}`}, ${ctx.userId}::uuid)`);
    }
    for (const p of input.payments) {
      await tx.execute(sql`INSERT INTO mahjong.payments (business_id, session_id, method, amount, created_by) VALUES (${ctx.businessId}::uuid, ${id}::uuid, ${p.method}, ${p.amount}, ${ctx.userId}::uuid)`);
    }
    await tx.execute(sql`
      UPDATE mahjong.play_sessions SET status = 'closed', ended_at = ${endedAt.toISOString()}::timestamptz, time_charge = ${bill.timeCharge}, fnb_total = ${fnb},
        discount_pct = ${discountPct}, discount_amount = ${bill.discount}, total = ${bill.total}, closed_by = ${ctx.userId}::uuid WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "session.closed", targetType: "session", targetId: id, meta: { total: bill.total } });
    return { bill, paid };
  });
}

/** Membatalkan sesi yang salah buka. Host hanya dalam 10 menit pertama; sesudahnya perlu Manajer. */
export async function voidSession(ctx: VenueContext, id: string): Promise<void> {
  requirePermission(ctx, "sessions.run");
  await inVenue(ctx, async (tx) => {
    const s = await loadBase(tx, id, true);
    if (s.status !== "open") throw new AppError(409, "closed", "Sesi ini sudah selesai.");
    const minutes = (Date.now() - +new Date(s.startedAt)) / 60_000;
    if (minutes > 10 && !ctx.can("settings.manage")) throw new AppError(403, "forbidden", "Sesi sudah berjalan lebih dari 10 menit. Minta Manajer atau Pemilik membatalkannya.");
    // Pesanan dikembalikan ke stok, booking dibuka lagi.
    await tx.execute(sql`
      UPDATE mahjong.menu_items m SET stock = m.stock + o.qty FROM mahjong.session_orders o
      WHERE o.session_id = ${id}::uuid AND o.status <> 'void' AND o.menu_item_id = m.id AND m.stock IS NOT NULL`);
    await tx.execute(sql`UPDATE mahjong.session_orders SET status = 'void' WHERE session_id = ${id}::uuid`);
    await tx.execute(sql`UPDATE mahjong.play_sessions SET status = 'void', ended_at = now(), total = 0, time_charge = 0, fnb_total = 0, discount_amount = 0, closed_by = ${ctx.userId}::uuid WHERE id = ${id}::uuid`);
    if (s.bookingId) await tx.execute(sql`UPDATE mahjong.bookings SET status = 'booked', session_id = NULL WHERE id = ${s.bookingId}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "session.voided", targetType: "session", targetId: id });
  });
}

export interface SessionListRow {
  id: string;
  tableName: string;
  label: string;
  startedAt: string;
  endedAt: string | null;
  status: "open" | "closed" | "void";
  total: number | null;
}

/** Riwayat sesi untuk satu tanggal (zona waktu tempat), terbaru dulu. */
export function listSessions(ctx: VenueContext, date: string): Promise<SessionListRow[]> {
  requirePermission(ctx, "floor.view");
  return inVenue(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT s.id, t.name AS "tableName", coalesce(m.full_name, s.guest_name, 'Tamu') AS label, s.started_at AS "startedAt", s.ended_at AS "endedAt", s.status, s.total
      FROM mahjong.play_sessions s
      JOIN mahjong.mj_tables t ON t.id = s.table_id
      JOIN core.businesses b ON b.id = s.business_id
      LEFT JOIN mahjong.members m ON m.id = s.member_id
      WHERE (s.started_at AT TIME ZONE b.timezone)::date = ${date}::date
      ORDER BY s.started_at DESC LIMIT 200`)) as unknown as SessionListRow[],
  );
}
