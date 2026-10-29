import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { InvoiceUpdateInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { invoices, teamFees, teams } from "./schema";
import { academyToday } from "./schedule";

/** "2026-10" ke tanggal awal bulan "2026-10-01". */
const periodOf = (month: string) => `${month}-01`;

export interface TeamFee {
  teamId: string;
  teamName: string;
  amount: number | null;
  playerCount: number;
}

export async function listTeamFees(ctx: AcademyContext): Promise<TeamFee[]> {
  requirePermission(ctx, "billing.read");
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT t.id AS "teamId", t.name AS "teamName", f.amount,
             (SELECT count(*)::int FROM bola.team_players tp JOIN bola.players p ON p.id = tp.player_id
               WHERE tp.team_id = t.id AND p.status = 'active') AS "playerCount"
      FROM bola.teams t LEFT JOIN bola.team_fees f ON f.team_id = t.id
      WHERE t.archived_at IS NULL
      ORDER BY t.age_min NULLS LAST, t.name`)) as unknown as TeamFee[],
  );
}

export async function setTeamFee(ctx: AcademyContext, teamId: string, amount: number): Promise<void> {
  requirePermission(ctx, "billing.manage");
  await inAcademy(ctx, async (tx) => {
    const [team] = await tx.select({ id: teams.id }).from(teams).where(eq(teams.id, teamId));
    if (!team) throw notFound("Tim");
    await tx
      .insert(teamFees)
      .values({ businessId: ctx.businessId, teamId, amount })
      .onConflictDoUpdate({ target: teamFees.teamId, set: { amount, updatedAt: new Date() } });
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "fee.updated",
      targetType: "team",
      targetId: teamId,
      meta: { amount },
    });
  });
}

/**
 * Membuat tagihan bulan `month` untuk semua pemain aktif yang timnya punya tarif.
 * Pemain di beberapa tim ditagih sekali dengan tarif tertinggi. Aman diulang: pemain yang sudah
 * punya tagihan bulan itu dilewati. Mengembalikan jumlah tagihan baru.
 */
export async function generateInvoices(ctx: AcademyContext, month: string): Promise<number> {
  requirePermission(ctx, "billing.manage");
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    // Tagihan hanya untuk bulan berjalan, bulan lalu, atau bulan depan.
    const current = today.slice(0, 7);
    const shift = (m: number) => {
      const d = new Date(`${current}-01T00:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + m);
      return d.toISOString().slice(0, 7);
    };
    if (month < shift(-1) || month > shift(1)) {
      throw new AppError(422, "invalid", "Tagihan hanya bisa dibuat untuk bulan lalu, bulan ini, atau bulan depan.");
    }
    const rows = (await tx.execute(sql`
      INSERT INTO bola.invoices (business_id, player_id, period, amount, recorded_by)
      SELECT ${ctx.businessId}::uuid, p.id, ${periodOf(month)}::date, max(f.amount), ${ctx.userId}::uuid
      FROM bola.players p
      JOIN bola.team_players tp ON tp.player_id = p.id
      JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
      JOIN bola.team_fees f ON f.team_id = t.id
      WHERE p.status = 'active'
      GROUP BY p.id
      ON CONFLICT (player_id, period) DO NOTHING
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "invoices.generated",
      targetType: "period",
      targetId: month,
      meta: { count: rows.length },
    });
    return rows.length;
  });
}

export interface InvoiceRow {
  id: string;
  playerId: string;
  fullName: string;
  teamNames: string;
  amount: number;
  status: "unpaid" | "paid" | "waived";
  method: "cash" | "transfer" | "other" | null;
  paidOn: string | null;
  /** Hanya untuk peran yang boleh melihat kontak wali. */
  guardianPhone: string | null;
  guardianName: string | null;
}

export interface MonthSummary {
  month: string;
  invoices: InvoiceRow[];
  billed: number;
  collected: number;
  outstanding: number;
  unpaidCount: number;
  /** Pemain aktif bertarif yang belum punya tagihan bulan ini. */
  missing: number;
}

export async function monthSummary(ctx: AcademyContext, month: string): Promise<MonthSummary> {
  requirePermission(ctx, "billing.read");
  const showGuardian = ctx.can("guardians.read");
  return inAcademy(ctx, async (tx) => {
    const list = (await tx.execute(sql`
      SELECT i.id, p.id AS "playerId", p.full_name AS "fullName", i.amount, i.status, i.method,
             to_char(i.paid_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "paidOn",
             ${showGuardian ? sql`p.guardian_phone` : sql`NULL`} AS "guardianPhone",
             ${showGuardian ? sql`p.guardian_name` : sql`NULL`} AS "guardianName",
             coalesce((SELECT string_agg(t.name, ', ' ORDER BY t.name) FROM bola.team_players tp
                        JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
                        WHERE tp.player_id = p.id), '') AS "teamNames"
      FROM bola.invoices i
      JOIN bola.players p ON p.id = i.player_id
      JOIN core.businesses b ON b.id = i.business_id
      WHERE i.period = ${periodOf(month)}::date
      ORDER BY (i.status = 'unpaid') DESC, p.full_name`)) as unknown as InvoiceRow[];
    const [gap] = (await tx.execute(sql`
      SELECT count(DISTINCT p.id)::int AS n
      FROM bola.players p
      JOIN bola.team_players tp ON tp.player_id = p.id
      JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
      JOIN bola.team_fees f ON f.team_id = t.id
      WHERE p.status = 'active'
        AND NOT EXISTS (SELECT 1 FROM bola.invoices i WHERE i.player_id = p.id AND i.period = ${periodOf(month)}::date)`)) as unknown as {
      n: number;
    }[];
    const live = list.filter((i) => i.status !== "waived");
    const collected = live.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
    const billed = live.reduce((s, i) => s + i.amount, 0);
    return {
      month,
      invoices: list,
      billed,
      collected,
      outstanding: billed - collected,
      unpaidCount: list.filter((i) => i.status === "unpaid").length,
      missing: gap?.n ?? 0,
    };
  });
}

/** Catat lunas, batalkan lunas, bebaskan (beasiswa), atau ubah nominal satu tagihan. */
export async function updateInvoice(
  ctx: AcademyContext,
  id: string,
  input: z.infer<typeof InvoiceUpdateInput>,
): Promise<void> {
  requirePermission(ctx, "billing.manage");
  await inAcademy(ctx, async (tx) => {
    const [inv] = await tx.select({ status: invoices.status }).from(invoices).where(eq(invoices.id, id));
    if (!inv) throw notFound("Tagihan");
    const set =
      input.action === "pay"
        ? { status: "paid" as const, paidAt: new Date(), method: input.method ?? "cash", recordedBy: ctx.userId }
        : input.action === "unpay"
          ? { status: "unpaid" as const, paidAt: null, method: null, recordedBy: ctx.userId }
          : input.action === "waive"
            ? { status: "waived" as const, paidAt: null, method: null, recordedBy: ctx.userId }
            : null;
    if (input.action === "amount") {
      if (input.amount === undefined) throw new AppError(422, "invalid", "Isi nominal.", { amount: "Isi nominal." });
      if (inv.status === "paid") throw new AppError(409, "paid", "Tagihan yang sudah lunas tidak bisa diubah nominalnya.");
      await tx.update(invoices).set({ amount: input.amount }).where(eq(invoices.id, id));
    } else {
      await tx.update(invoices).set(set!).where(and(eq(invoices.id, id)));
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: `invoice.${input.action}`,
      targetType: "invoice",
      targetId: id,
      meta: input.action === "amount" ? { amount: input.amount } : input.action === "pay" ? { method: input.method } : {},
    });
  });
}

/** Ringkasan untuk Beranda: tunggakan bulan ini. */
export async function billingHome(
  ctx: AcademyContext,
): Promise<{ month: string; outstanding: number; unpaidCount: number; billed: number; collected: number } | null> {
  if (!ctx.can("billing.read")) return null;
  const month = (await inAcademy(ctx, academyToday)).slice(0, 7);
  const s = await monthSummary(ctx, month);
  return { month, outstanding: s.outstanding, unpaidCount: s.unpaidCount, billed: s.billed, collected: s.collected };
}

export interface PlayerInvoice {
  id: string;
  month: string;
  amount: number;
  status: "unpaid" | "paid" | "waived";
  paidOn: string | null;
}

/** Riwayat iuran satu pemain (6 bulan terakhir) untuk halaman pemain. */
export async function playerInvoices(ctx: AcademyContext, playerId: string): Promise<PlayerInvoice[]> {
  requirePermission(ctx, "billing.read");
  return inAcademy(
    ctx,
    async (tx) =>
      (await tx.execute(sql`
        SELECT i.id, to_char(i.period, 'YYYY-MM') AS month, i.amount, i.status,
               to_char(i.paid_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "paidOn"
        FROM bola.invoices i JOIN core.businesses b ON b.id = i.business_id
        WHERE i.player_id = ${playerId}::uuid
        ORDER BY i.period DESC
        LIMIT 6`)) as unknown as PlayerInvoice[],
  );
}
