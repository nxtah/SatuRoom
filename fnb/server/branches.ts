import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { BranchInput, BranchRequestInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type Branch = { id: string; name: string; address: string | null; isPrimary: boolean; itemStock: number };
export type BranchRequest = { id: string; name: string; note: string | null; status: string; at: string };
export type BranchOverview = { branches: Branch[]; limit: number; used: number; requests: BranchRequest[] };

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "branches.manage")) throw forbidden(); };

/** Cabang aktif dibatasi jatah `outlet_limit`; tanpa baris jatah berarti 1 (gratis). Jatah dinaikkan admin SatuRoom setelah pembayaran. */
export async function branchOverview(ctx: FnbContext): Promise<BranchOverview> {
  if (!can(ctx, "branches.manage") && !can(ctx, "stock.manage")) throw forbidden();
  return inBusiness(ctx, async (tx) => {
    const branches = (await tx.execute(sql`
      SELECT o.id, o.name, o.address, o.is_primary AS "isPrimary", coalesce((SELECT sum(i.stock) FROM fnb.outlet_items i WHERE i.outlet_id = o.id), 0)::int AS "itemStock"
      FROM fnb.outlets o WHERE o.archived_at IS NULL ORDER BY o.is_primary DESC, o.name`)) as unknown as Branch[];
    const [lim] = (await tx.execute(sql`SELECT outlet_limit AS n FROM fnb.business_limits`)) as unknown as { n: number }[];
    const requests = (await tx.execute(sql`SELECT id, requested_name AS name, note, status, created_at AS at FROM fnb.branch_requests ORDER BY created_at DESC LIMIT 10`)) as unknown as BranchRequest[];
    return { branches, limit: lim?.n ?? 1, used: branches.length, requests };
  });
}

export async function createBranch(ctx: FnbContext, input: z.infer<typeof BranchInput>) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`branch:${ctx.businessId}`}))`);
    const [lim] = (await tx.execute(sql`SELECT outlet_limit AS n FROM fnb.business_limits`)) as unknown as { n: number }[];
    const [cnt] = (await tx.execute(sql`SELECT count(*)::int AS n FROM fnb.outlets WHERE archived_at IS NULL`)) as unknown as { n: number }[];
    if (cnt!.n >= (lim?.n ?? 1)) throw new AppError(402, "branch_limit", "Jatah cabang penuh. Ajukan cabang tambahan lebih dulu; setelah diaktifkan admin, cabang baru bisa dibuat.");
    const [dup] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.outlets WHERE archived_at IS NULL AND lower(name) = lower(${input.name})`)) as unknown as unknown[];
    if (dup) throw new AppError(409, "duplicate", "Nama cabang sudah dipakai.");
    const [row] = (await tx.execute(sql`INSERT INTO fnb.outlets (business_id, name, address) VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.address || null}) RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.branch.created", targetType: "outlet", targetId: row!.id, meta: { name: input.name } });
    return { id: row!.id };
  });
}

export async function updateBranch(ctx: FnbContext, id: string, input: z.infer<typeof BranchInput>) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const [dup] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.outlets WHERE archived_at IS NULL AND id <> ${id}::uuid AND lower(name) = lower(${input.name})`)) as unknown as unknown[];
    if (dup) throw new AppError(409, "duplicate", "Nama cabang sudah dipakai.");
    const rows = (await tx.execute(sql`UPDATE fnb.outlets SET name = ${input.name}, address = ${input.address || null} WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Cabang");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.branch.updated", targetType: "outlet", targetId: id, meta: { name: input.name } });
  });
}

export async function archiveBranch(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const [o] = (await tx.execute(sql`SELECT is_primary AS p, coalesce((SELECT sum(stock) FROM fnb.outlet_items WHERE outlet_id = ${id}::uuid), 0)::int AS stock FROM fnb.outlets WHERE id = ${id}::uuid AND archived_at IS NULL`)) as unknown as { p: boolean; stock: number }[];
    if (!o) throw notFound("Cabang");
    if (o.p) throw new AppError(409, "primary_branch", "Cabang utama tidak bisa dinonaktifkan.");
    if (o.stock > 0) throw new AppError(409, "branch_has_stock", "Cabang masih punya stok barang. Pindahkan lewat transfer stok dulu.");
    const [open] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.stock_transfers WHERE status IN ('draft', 'dikirim') AND (from_outlet_id = ${id}::uuid OR to_outlet_id = ${id}::uuid) LIMIT 1`)) as unknown as unknown[];
    if (open) throw new AppError(409, "branch_in_use", "Cabang punya transfer stok yang belum selesai.");
    await tx.execute(sql`UPDATE fnb.outlets SET archived_at = now() WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.branch.archived", targetType: "outlet", targetId: id });
  });
}

export async function requestBranch(ctx: FnbContext, input: z.infer<typeof BranchRequestInput>) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    try {
      const [row] = (await tx.execute(sql`INSERT INTO fnb.branch_requests (business_id, requested_name, note, requested_by) VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.note || null}, ${ctx.userId}::uuid) RETURNING id`)) as unknown as { id: string }[];
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.branch.requested", targetType: "branch_request", targetId: row!.id, meta: { name: input.name } });
      return { id: row!.id };
    } catch (e) {
      if ((e as { cause?: { code?: string } }).cause?.code === "23505") throw new AppError(409, "request_open", "Sudah ada permintaan cabang yang menunggu diproses.");
      throw e;
    }
  });
}

export async function cancelBranchRequest(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.branch_requests SET status = 'dibatalkan' WHERE id = ${id}::uuid AND status = 'menunggu' RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Permintaan");
  });
}
