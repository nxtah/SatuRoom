import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { InvoiceUpdateInput } from "@/lib/schemas";
import { teamIdsInBranches } from "./branches";
import { accountIdOf, postJournal, reverseSource } from "./ledger";
import { inAcademy, requirePermission, type AcademyContext, requireModule } from "./context";
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

/** Batas cabang untuk query iuran: tim dan pemain di cabang staf saja. */
async function branchScope(ctx: AcademyContext, tx: Tx) {
  if (ctx.branchIds === null) return { teams: sql``, players: sql`` };
  const ids = await teamIdsInBranches(tx, ctx.branchIds);
  const list = `{${ids.join(",")}}`;
  return {
    teams: sql`AND t.id = ANY (${list}::uuid[])`,
    players: sql`AND p.id IN (SELECT player_id FROM bola.team_players WHERE team_id = ANY (${list}::uuid[]))`,
  };
}

export async function listTeamFees(ctx: AcademyContext): Promise<TeamFee[]> {
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.read");
  return inAcademy(ctx, async (tx) => {
    const scope = await branchScope(ctx, tx);
    return (await tx.execute(sql`
      SELECT t.id AS "teamId", t.name AS "teamName", f.amount,
             (SELECT count(*)::int FROM bola.team_players tp JOIN bola.players p ON p.id = tp.player_id
               WHERE tp.team_id = t.id AND p.status = 'active') AS "playerCount"
      FROM bola.teams t LEFT JOIN bola.team_fees f ON f.team_id = t.id
      WHERE t.archived_at IS NULL ${scope.teams}
      ORDER BY t.age_min NULLS LAST, t.name`)) as unknown as TeamFee[];
  });
}

export async function setTeamFee(ctx: AcademyContext, teamId: string, amount: number): Promise<void> {
  requireModule(ctx, "billing");
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
 * Pemain di beberapa tim ditagih sekali dengan tarif tertinggi. Beasiswa aktif langsung menjadi
 * potongan. Aman diulang: pemain yang sudah punya tagihan bulan itu dilewati. Setiap tagihan
 * langsung dijurnal (Piutang iuran / Pendapatan iuran). Mengembalikan jumlah tagihan baru.
 */
export async function generateInvoices(ctx: AcademyContext, month: string): Promise<number> {
  requireModule(ctx, "billing");
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
    const scope = await branchScope(ctx, tx);
    const rows = (await tx.execute(sql`
      WITH base AS (
        SELECT p.id AS player_id, p.full_name, max(f.amount) AS amount
        FROM bola.players p
        JOIN bola.team_players tp ON tp.player_id = p.id
        JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
        JOIN bola.team_fees f ON f.team_id = t.id
        WHERE p.status = 'active' ${scope.players}
        GROUP BY p.id
      ), disc AS (
        SELECT b.*, s.reason,
          least(b.amount, coalesce(CASE WHEN s.kind = 'percent' THEN (b.amount * s.value / 100) ELSE s.value END, 0))::int AS discount
        FROM base b
        LEFT JOIN LATERAL (
          SELECT kind, value, reason FROM bola.scholarships s
          WHERE s.player_id = b.player_id AND s.archived_at IS NULL
            AND s.starts_on <= (${periodOf(month)}::date + interval '1 month' - interval '1 day')
            AND (s.ends_on IS NULL OR s.ends_on >= ${periodOf(month)}::date)
          ORDER BY s.created_at DESC LIMIT 1
        ) s ON true
      )
      INSERT INTO bola.invoices (business_id, player_id, period, amount, discount, discount_note, status, recorded_by)
      SELECT ${ctx.businessId}::uuid, player_id, ${periodOf(month)}::date, amount, discount,
             CASE WHEN discount > 0 THEN left('Beasiswa: ' || reason, 120) END,
             CASE WHEN amount - discount = 0 THEN 'waived' ELSE 'unpaid' END::bola.invoice_status, ${ctx.userId}::uuid
      FROM disc
      ON CONFLICT (player_id, period) DO NOTHING
      RETURNING id, amount - discount AS net,
        (SELECT full_name FROM bola.players WHERE id = player_id) AS name`)) as unknown as { id: string; net: number; name: string }[];
    for (const r of rows) await postInvoice(ctx, tx, r.id, r.net, month, r.name);
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

const actor = (ctx: AcademyContext) => ({ businessId: ctx.businessId, userId: ctx.userId });

async function postInvoice(ctx: AcademyContext, tx: Tx, id: string, net: number, month: string, name: string) {
  await postJournal(tx, actor(ctx), {
    date: periodOf(month),
    memo: `Iuran ${month.slice(5, 7)}/${month.slice(0, 4)} - ${name}`,
    source: "invoice",
    sourceId: id,
    lines: [
      { account: { key: "receivable" }, debit: net },
      { account: { key: "fee_income" }, credit: net },
    ],
  });
}

export interface InvoiceRow {
  id: string;
  playerId: string;
  fullName: string;
  teamNames: string;
  /** Tarif sebelum potongan. */
  amount: number;
  discount: number;
  discountNote: string | null;
  /** Yang harus dibayar: tarif - potongan. */
  net: number;
  paid: number;
  remaining: number;
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

const PAID_SQL = sql`coalesce((SELECT sum(x.amount) FROM bola.payments x WHERE x.invoice_id = i.id AND x.voided_at IS NULL), 0)::int`;

export async function monthSummary(ctx: AcademyContext, month: string): Promise<MonthSummary> {
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.read");
  const showGuardian = ctx.can("guardians.read");
  return inAcademy(ctx, async (tx) => {
    const scope = await branchScope(ctx, tx);
    const list = (await tx.execute(sql`
      SELECT i.id, p.id AS "playerId", p.full_name AS "fullName", i.amount, i.discount, i.discount_note AS "discountNote",
             i.amount - i.discount AS net, ${PAID_SQL} AS paid, i.status, i.method,
             to_char(i.paid_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "paidOn",
             ${showGuardian ? sql`p.guardian_phone` : sql`NULL`} AS "guardianPhone",
             ${showGuardian ? sql`p.guardian_name` : sql`NULL`} AS "guardianName",
             coalesce((SELECT string_agg(t.name, ', ' ORDER BY t.name) FROM bola.team_players tp
                        JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
                        WHERE tp.player_id = p.id), '') AS "teamNames"
      FROM bola.invoices i
      JOIN bola.players p ON p.id = i.player_id
      JOIN core.businesses b ON b.id = i.business_id
      WHERE i.period = ${periodOf(month)}::date ${scope.players}
      ORDER BY (i.status = 'unpaid') DESC, p.full_name`)) as unknown as Omit<InvoiceRow, "remaining">[];
    const [gap] = (await tx.execute(sql`
      SELECT count(DISTINCT p.id)::int AS n
      FROM bola.players p
      JOIN bola.team_players tp ON tp.player_id = p.id
      JOIN bola.teams t ON t.id = tp.team_id AND t.archived_at IS NULL
      JOIN bola.team_fees f ON f.team_id = t.id
      WHERE p.status = 'active' ${scope.players}
        AND NOT EXISTS (SELECT 1 FROM bola.invoices i WHERE i.player_id = p.id AND i.period = ${periodOf(month)}::date)`)) as unknown as {
      n: number;
    }[];
    const invoices = list.map((i) => ({ ...i, remaining: i.status === "waived" ? 0 : Math.max(0, i.net - i.paid) }));
    const live = invoices.filter((i) => i.status !== "waived");
    const billed = live.reduce((s, i) => s + i.net, 0);
    const collected = live.reduce((s, i) => s + Math.min(i.paid, i.net), 0);
    return {
      month,
      invoices,
      billed,
      collected,
      outstanding: billed - collected,
      unpaidCount: invoices.filter((i) => i.status === "unpaid").length,
      missing: gap?.n ?? 0,
    };
  });
}

/**
 * Aksi satu tagihan: bayar (penuh atau sebagian), batalkan semua pembayaran, bebaskan, ubah nominal,
 * atau beri potongan. Setiap perubahan uang dicatat sebagai jurnal; jurnal lama dibalik, tidak diubah.
 */
export async function updateInvoice(
  ctx: AcademyContext,
  id: string,
  input: z.infer<typeof InvoiceUpdateInput>,
): Promise<void> {
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.manage");
  await inAcademy(ctx, async (tx) => {
    const scope = await branchScope(ctx, tx);
    const [inv] = (await tx.execute(sql`
      SELECT i.status, i.amount, i.discount, ${PAID_SQL} AS paid, p.full_name AS name, to_char(i.period, 'YYYY-MM') AS month
      FROM bola.invoices i JOIN bola.players p ON p.id = i.player_id
      WHERE i.id = ${id}::uuid ${scope.players} FOR UPDATE OF i`)) as unknown as {
      status: "unpaid" | "paid" | "waived"; amount: number; discount: number; paid: number; name: string; month: string;
    }[];
    if (!inv) throw notFound("Tagihan");
    const today = await academyToday(tx);
    const net = inv.amount - inv.discount;
    const who = actor(ctx);

    if (input.action === "pay") {
      if (inv.status !== "unpaid") throw new AppError(409, "not_unpaid", "Tagihan ini tidak sedang menunggu pembayaran.");
      const remaining = net - inv.paid;
      const amount = input.amount ?? remaining;
      if (amount < 1 || amount > remaining) {
        throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { amount: `Isi antara 1 dan ${remaining}.` });
      }
      const method = input.method ?? "cash";
      const paidOn = input.paidOn ?? today;
      if (paidOn > today) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { paidOn: "Tanggal bayar tidak boleh di masa depan." });
      const accountId = input.accountId ?? (await accountIdOf(tx, method === "transfer" ? "bank" : "cash"));
      const [acc] = (await tx.execute(sql`SELECT 1 AS x FROM bola.accounts WHERE id = ${accountId}::uuid AND is_cash AND archived_at IS NULL`)) as unknown as unknown[];
      if (!acc) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { accountId: "Pilih akun kas atau bank." });
      const [pay] = (await tx.execute(sql`
        INSERT INTO bola.payments (business_id, invoice_id, amount, paid_on, method, account_id, note, recorded_by)
        VALUES (${ctx.businessId}::uuid, ${id}::uuid, ${amount}, ${paidOn}::date, ${method}::bola.payment_method, ${accountId}::uuid,
                ${input.note ?? null}, ${ctx.userId}::uuid)
        RETURNING id`)) as unknown as { id: string }[];
      await postJournal(tx, who, {
        date: paidOn,
        memo: `Pembayaran iuran ${inv.month.slice(5)}/${inv.month.slice(0, 4)} - ${inv.name}`,
        source: "payment",
        sourceId: pay!.id,
        lines: [
          { account: accountId, debit: amount },
          { account: { key: "receivable" }, credit: amount },
        ],
      });
      if (inv.paid + amount >= net) {
        await tx.update(invoices).set({ status: "paid", paidAt: new Date(), method, recordedBy: ctx.userId }).where(eq(invoices.id, id));
      }
    } else if (input.action === "unpay") {
      // Batalkan semua pembayaran (mis. salah catat). Tagihan kembali menunggu.
      const pays = (await tx.execute(sql`
        UPDATE bola.payments SET voided_at = now() WHERE invoice_id = ${id}::uuid AND voided_at IS NULL RETURNING id`)) as unknown as { id: string }[];
      for (const p of pays) await reverseSource(tx, who, "payment", p.id, today);
      if (inv.status === "waived" && net > 0) await postInvoice(ctx, tx, id, net, inv.month, inv.name);
      await tx.update(invoices).set({ status: net > 0 ? "unpaid" : "waived", paidAt: null, method: null, recordedBy: ctx.userId }).where(eq(invoices.id, id));
    } else if (input.action === "waive") {
      if (inv.paid > 0) throw new AppError(409, "has_payments", "Tagihan ini sudah ada pembayarannya. Batalkan pembayarannya dulu.");
      await reverseSource(tx, who, "invoice", id, today);
      await tx.update(invoices).set({ status: "waived", paidAt: null, method: null, recordedBy: ctx.userId }).where(eq(invoices.id, id));
    } else {
      // amount / discount: nominal atau potongan berubah, jurnal tagihan dibalik lalu dicatat ulang.
      if (inv.status === "paid") throw new AppError(409, "paid", "Tagihan yang sudah lunas tidak bisa diubah nominalnya.");
      if (inv.status === "waived") throw new AppError(409, "waived", "Tagih lagi dulu sebelum mengubah nominal.");
      const amount = input.action === "amount" ? input.amount : inv.amount;
      const discount = input.action === "discount" ? input.discount : inv.discount;
      if (amount === undefined || discount === undefined) {
        throw new AppError(422, "invalid", "Isi nominal.", { [input.action]: "Isi nominal." });
      }
      if (discount > amount) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { discount: "Potongan tidak boleh melebihi tarif." });
      if (amount - discount < inv.paid) {
        throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { [input.action]: "Lebih kecil dari yang sudah dibayar." });
      }
      await reverseSource(tx, who, "invoice", id, today);
      await tx
        .update(invoices)
        .set({ amount, discount, discountNote: input.action === "discount" ? (input.note ?? null) : undefined })
        .where(eq(invoices.id, id));
      if (amount - discount > 0) {
        await postJournal(tx, who, {
          date: today,
          memo: `Iuran ${inv.month.slice(5)}/${inv.month.slice(0, 4)} (diubah) - ${inv.name}`,
          source: "invoice",
          sourceId: id,
          lines: [
            { account: { key: "receivable" }, debit: amount - discount },
            { account: { key: "fee_income" }, credit: amount - discount },
          ],
        });
      }
      if (amount - discount === 0) {
        await tx.update(invoices).set({ status: "waived" }).where(eq(invoices.id, id));
      } else if (inv.paid >= amount - discount) {
        await tx.update(invoices).set({ status: "paid", paidAt: new Date(), method: "cash", recordedBy: ctx.userId }).where(eq(invoices.id, id));
      }
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: `invoice.${input.action}`,
      targetType: "invoice",
      targetId: id,
      meta:
        input.action === "amount"
          ? { amount: input.amount }
          : input.action === "discount"
            ? { discount: input.discount }
            : input.action === "pay"
              ? { method: input.method, amount: input.amount ?? null }
              : {},
    });
  });
}

/** Ringkasan untuk Beranda: tunggakan bulan ini. */
export async function billingHome(
  ctx: AcademyContext,
): Promise<{ month: string; outstanding: number; unpaidCount: number; billed: number; collected: number } | null> {
  if (!ctx.can("billing.read") || !ctx.modules.has("billing")) return null;
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
  requireModule(ctx, "billing");
  requirePermission(ctx, "billing.read");
  return inAcademy(
    ctx,
    async (tx) =>
      (await tx.execute(sql`
        SELECT i.id, to_char(i.period, 'YYYY-MM') AS month, CASE WHEN i.status = 'unpaid' THEN i.amount - i.discount - coalesce((SELECT sum(x.amount) FROM bola.payments x WHERE x.invoice_id = i.id AND x.voided_at IS NULL), 0) ELSE i.amount - i.discount END::int AS amount, i.status,
               to_char(i.paid_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS "paidOn"
        FROM bola.invoices i JOIN core.businesses b ON b.id = i.business_id
        WHERE i.player_id = ${playerId}::uuid
        ORDER BY i.period DESC
        LIMIT 6`)) as unknown as PlayerInvoice[],
  );
}
