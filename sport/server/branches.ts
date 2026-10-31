import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { BranchInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { branches, locations } from "./schema";

export interface BranchRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isPrimary: boolean;
  locations: number;
  teams: number;
  players: number;
  staff: number;
}

/** Tim aktif di cabang tertentu (tim → lokasi → cabang). */
export async function teamIdsInBranches(tx: Tx, branchIds: string[]): Promise<string[]> {
  if (branchIds.length === 0) return [];
  const rows = (await tx.execute(sql`
    SELECT t.id FROM bola.teams t JOIN bola.locations l ON l.id = t.location_id
    WHERE l.branch_id = ANY (${`{${branchIds.join(",")}}`}::uuid[])`)) as unknown as { id: string }[];
  return rows.map((r) => r.id);
}

/** Cabang yang boleh dipilih staf ini (semua bila tanpa batas cabang). */
export function canUseBranch(ctx: AcademyContext, branchId: string) {
  return ctx.branchIds === null || ctx.branchIds.includes(branchId);
}

export function listBranches(ctx: AcademyContext): Promise<BranchRow[]> {
  return inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT b.id, b.name, b.address, b.phone, b.is_primary AS "isPrimary",
        (SELECT count(*)::int FROM bola.locations l WHERE l.branch_id = b.id AND l.archived_at IS NULL) AS locations,
        (SELECT count(*)::int FROM bola.teams t JOIN bola.locations l ON l.id = t.location_id
           WHERE l.branch_id = b.id AND t.archived_at IS NULL) AS teams,
        (SELECT count(DISTINCT tp.player_id)::int FROM bola.team_players tp JOIN bola.teams t ON t.id = tp.team_id
           JOIN bola.locations l ON l.id = t.location_id JOIN bola.players p ON p.id = tp.player_id
           WHERE l.branch_id = b.id AND t.archived_at IS NULL AND p.status = 'active') AS players,
        (SELECT count(*)::int FROM bola.staff_branches s JOIN core.memberships m ON m.id = s.membership_id
           WHERE s.branch_id = b.id AND m.status = 'active') AS staff
      FROM bola.branches b WHERE b.archived_at IS NULL
      ORDER BY b.is_primary DESC, lower(b.name)`)) as unknown as BranchRow[];
    return ctx.branchIds === null ? rows : rows.filter((r) => ctx.branchIds!.includes(r.id));
  });
}

const clash = (e: unknown) =>
  typeof e === "object" && e !== null && "cause" in e && (e.cause as { code?: string })?.code === "23505";

export async function createBranch(ctx: AcademyContext, input: z.infer<typeof BranchInput>): Promise<string> {
  requirePermission(ctx, "branches.manage");
  if (ctx.branchIds !== null) throw forbidden();
  try {
    return await inAcademy(ctx, async (tx) => {
      const [row] = await tx
        .insert(branches)
        .values({ businessId: ctx.businessId, name: input.name, address: input.address ?? null, phone: input.phone ?? null })
        .returning({ id: branches.id });
      // Setiap cabang langsung punya satu lokasi latihan supaya tim bisa dibuat di sana.
      await tx.insert(locations).values({ businessId: ctx.businessId, branchId: row!.id, name: `Lapangan ${input.name}`, address: input.address ?? null });
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "branch.created", targetType: "branch", targetId: row!.id, meta: { name: input.name } });
      return row!.id;
    });
  } catch (e) {
    if (clash(e)) throw new AppError(409, "duplicate", "Nama cabang ini sudah dipakai.", { name: "Nama cabang ini sudah dipakai." });
    throw e;
  }
}

export async function updateBranch(ctx: AcademyContext, id: string, input: z.infer<typeof BranchInput>): Promise<void> {
  requirePermission(ctx, "branches.manage");
  if (!canUseBranch(ctx, id)) throw notFound("Cabang");
  try {
    await inAcademy(ctx, async (tx) => {
      const rows = await tx
        .update(branches)
        .set({ name: input.name, address: input.address ?? null, phone: input.phone ?? null })
        .where(and(eq(branches.id, id), isNull(branches.archivedAt)))
        .returning({ id: branches.id });
      if (!rows.length) throw notFound("Cabang");
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "branch.updated", targetType: "branch", targetId: id });
    });
  } catch (e) {
    if (clash(e)) throw new AppError(409, "duplicate", "Nama cabang ini sudah dipakai.", { name: "Nama cabang ini sudah dipakai." });
    throw e;
  }
}

/** Cabang utama dan cabang yang masih punya tim aktif tidak bisa diarsipkan. */
export async function archiveBranch(ctx: AcademyContext, id: string): Promise<void> {
  requirePermission(ctx, "branches.manage");
  if (ctx.branchIds !== null) throw forbidden();
  await inAcademy(ctx, async (tx) => {
    const [b] = await tx.select().from(branches).where(and(eq(branches.id, id), isNull(branches.archivedAt)));
    if (!b) throw notFound("Cabang");
    if (b.isPrimary) throw new AppError(409, "primary", "Cabang utama tidak bisa diarsipkan.");
    const teamIds = await teamIdsInBranches(tx, [id]);
    const [active] = teamIds.length
      ? ((await tx.execute(sql`SELECT count(*)::int AS n FROM bola.teams WHERE id = ANY (${`{${teamIds.join(",")}}`}::uuid[]) AND archived_at IS NULL`)) as unknown as { n: number }[])
      : [{ n: 0 }];
    if (active!.n > 0) throw new AppError(409, "in_use", "Cabang ini masih punya tim aktif. Pindahkan atau arsipkan timnya dulu.");
    await tx.update(branches).set({ archivedAt: new Date() }).where(eq(branches.id, id));
    await tx.update(locations).set({ archivedAt: new Date() }).where(and(eq(locations.branchId, id), isNull(locations.archivedAt)));
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "branch.archived", targetType: "branch", targetId: id });
  });
}

/** Memastikan cabang ada, aktif, dan boleh dipakai staf ini. */
export async function assertBranches(ctx: AcademyContext, tx: Tx, ids: string[]) {
  if (ids.length === 0) return;
  if (ids.some((id) => !canUseBranch(ctx, id))) throw forbidden();
  const found = await tx.select({ id: branches.id }).from(branches).where(and(inArray(branches.id, ids), isNull(branches.archivedAt)));
  if (found.length !== new Set(ids).size) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { branchIds: "Cabang tidak ditemukan." });
}

export async function primaryBranchId(tx: Tx): Promise<string> {
  const [b] = await tx.select({ id: branches.id }).from(branches).where(and(eq(branches.isPrimary, true), isNull(branches.archivedAt)));
  if (!b) throw new AppError(409, "no_branch", "Cabang utama akademi belum ada.");
  return b.id;
}
