import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { MemberInput, TopUpInput } from "@/lib/schemas";
import type { Tier } from "@/lib/billing";
import { inVenue, requirePermission, type VenueContext } from "./context";
import { AppError, notFound } from "./errors";

export interface MemberRow {
  id: string;
  fullName: string;
  phone: string | null;
  tier: Tier;
  balance: number;
  visits: number;
  lastVisit: string | null;
}

const phoneTaken = () => new AppError(409, "duplicate", "Nomor ini sudah dipakai member lain.", { phone: "Nomor ini sudah dipakai member lain." });
const isDup = (e: unknown) => typeof e === "object" && e !== null && "cause" in e && (e.cause as { code?: string })?.code === "23505";

/** Daftar member dengan saldo dan jumlah kunjungan. `q` mencari nama atau nomor telepon. */
export function listMembers(ctx: VenueContext, q = "", limit = 200): Promise<MemberRow[]> {
  requirePermission(ctx, "members.read");
  const like = `%${q.trim().replace(/[%_\\]/g, "\\$&")}%`;
  return inVenue(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT m.id, m.full_name AS "fullName", m.phone, m.tier,
        coalesce((SELECT sum(l.amount) FROM mahjong.member_ledger l WHERE l.member_id = m.id), 0)::int AS balance,
        (SELECT count(*) FROM mahjong.play_sessions s WHERE s.member_id = m.id AND s.status = 'closed')::int AS visits,
        (SELECT to_char(max(s.started_at) AT TIME ZONE b.timezone, 'YYYY-MM-DD') FROM mahjong.play_sessions s WHERE s.member_id = m.id AND s.status = 'closed') AS "lastVisit"
      FROM mahjong.members m JOIN core.businesses b ON b.id = m.business_id
      WHERE m.archived_at IS NULL AND (${q.trim() === ""} OR m.full_name ILIKE ${like} OR m.phone LIKE ${like})
      ORDER BY m.full_name LIMIT ${limit}`)) as unknown as MemberRow[],
  );
}

export async function createMember(ctx: VenueContext, input: z.infer<typeof MemberInput>): Promise<string> {
  requirePermission(ctx, "members.manage");
  try {
    return await inVenue(ctx, async (tx) => {
      const [row] = (await tx.execute(sql`
        INSERT INTO mahjong.members (business_id, full_name, phone, tier, note)
        VALUES (${ctx.businessId}::uuid, ${input.fullName}, ${input.phone}, ${input.tier}, ${input.note ?? null}) RETURNING id`)) as unknown as { id: string }[];
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "member.created", targetType: "member", targetId: row!.id });
      return row!.id;
    });
  } catch (e) {
    if (isDup(e)) throw phoneTaken();
    throw e;
  }
}

export async function updateMember(ctx: VenueContext, id: string, input: z.infer<typeof MemberInput>): Promise<void> {
  requirePermission(ctx, "members.manage");
  try {
    await inVenue(ctx, async (tx) => {
      const done = (await tx.execute(sql`
        UPDATE mahjong.members SET full_name = ${input.fullName}, phone = ${input.phone}, tier = ${input.tier}, note = ${input.note ?? null}
        WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
      if (!done.length) throw notFound("Member");
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "member.updated", targetType: "member", targetId: id });
    });
  } catch (e) {
    if (isDup(e)) throw phoneTaken();
    throw e;
  }
}

export interface LedgerRow {
  id: string;
  kind: "topup" | "spend" | "adjust" | "refund";
  amount: number;
  method: string | null;
  note: string | null;
  at: string;
}

export interface MemberDetail extends MemberRow {
  note: string | null;
  joinedOn: string;
  ledger: LedgerRow[];
  recent: { id: string; date: string; tableName: string; total: number; minutes: number }[];
  totalSpent: number;
}

export function getMember(ctx: VenueContext, id: string): Promise<MemberDetail> {
  requirePermission(ctx, "members.read");
  return inVenue(ctx, async (tx) => {
    const [base] = (await tx.execute(sql`
      SELECT m.id, m.full_name AS "fullName", m.phone, m.tier, m.note, to_char(m.created_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "joinedOn",
        coalesce((SELECT sum(l.amount) FROM mahjong.member_ledger l WHERE l.member_id = m.id), 0)::int AS balance,
        (SELECT count(*) FROM mahjong.play_sessions s WHERE s.member_id = m.id AND s.status = 'closed')::int AS visits,
        (SELECT to_char(max(s.started_at) AT TIME ZONE b.timezone, 'YYYY-MM-DD') FROM mahjong.play_sessions s WHERE s.member_id = m.id AND s.status = 'closed') AS "lastVisit",
        (SELECT coalesce(sum(s.total), 0) FROM mahjong.play_sessions s WHERE s.member_id = m.id AND s.status = 'closed')::int AS "totalSpent"
      FROM mahjong.members m JOIN core.businesses b ON b.id = m.business_id
      WHERE m.id = ${id}::uuid AND m.archived_at IS NULL`)) as unknown as (Omit<MemberDetail, "ledger" | "recent">)[];
    if (!base) throw notFound("Member");
    const ledger = (await tx.execute(sql`
      SELECT l.id, l.kind, l.amount, l.method, l.note, to_char(l.created_at AT TIME ZONE b.timezone, 'YYYY-MM-DD"T"HH24:MI') AS at
      FROM mahjong.member_ledger l JOIN core.businesses b ON b.id = l.business_id
      WHERE l.member_id = ${id}::uuid ORDER BY l.created_at DESC LIMIT 30`)) as unknown as LedgerRow[];
    const recent = (await tx.execute(sql`
      SELECT s.id, to_char(s.started_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date, t.name AS "tableName", s.total,
             round(extract(epoch FROM (s.ended_at - s.started_at)) / 60)::int AS minutes
      FROM mahjong.play_sessions s JOIN mahjong.mj_tables t ON t.id = s.table_id JOIN core.businesses b ON b.id = s.business_id
      WHERE s.member_id = ${id}::uuid AND s.status = 'closed' ORDER BY s.started_at DESC LIMIT 8`)) as unknown as MemberDetail["recent"];
    return { ...base, ledger, recent };
  });
}

/** Isi saldo member. Saldo dipakai membayar sesi; baris buku tidak pernah diubah. */
export async function topUp(ctx: VenueContext, memberId: string, input: z.infer<typeof TopUpInput>): Promise<void> {
  requirePermission(ctx, "members.manage");
  await inVenue(ctx, async (tx) => {
    const [m] = (await tx.execute(sql`SELECT id FROM mahjong.members WHERE id = ${memberId}::uuid AND archived_at IS NULL FOR UPDATE`)) as unknown as { id: string }[];
    if (!m) throw notFound("Member");
    await tx.execute(sql`
      INSERT INTO mahjong.member_ledger (business_id, member_id, kind, amount, method, note, created_by)
      VALUES (${ctx.businessId}::uuid, ${memberId}::uuid, 'topup', ${input.amount}, ${input.method}, ${input.note ?? null}, ${ctx.userId}::uuid)`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "member.topup", targetType: "member", targetId: memberId, meta: { amount: input.amount, method: input.method } });
  });
}
