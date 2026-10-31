import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents, memberships, users } from "@saturoom/core/schema";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { TeamInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { branches, locations, players, teamCoaches, teamPlayers, teams } from "./schema";
import { teamIdsInBranches } from "./branches";

/**
 * Tim yang boleh dilihat: semua tim untuk peran dengan izin `teams.read_all`, atau hanya tim
 * yang ditugaskan untuk pelatih. `null` berarti tanpa batas.
 */
export async function visibleTeamIds(ctx: AcademyContext, tx: Tx): Promise<string[] | null> {
  // Staf dengan batas cabang hanya melihat tim di cabangnya, juga bila punya izin "semua".
  if (ctx.can("teams.read_all")) return ctx.branchIds === null ? null : teamIdsInBranches(tx, ctx.branchIds);
  const rows = await tx
    .select({ id: teamCoaches.teamId })
    .from(teamCoaches)
    .where(eq(teamCoaches.membershipId, ctx.membershipId));
  return rows.map((r) => r.id);
}

export interface TeamSummary {
  id: string;
  name: string;
  ageMin: number | null;
  ageMax: number | null;
  locationId: string;
  branchName: string;
  playerCount: number;
  coaches: string[];
}

export function listTeams(ctx: AcademyContext): Promise<TeamSummary[]> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    if (scope && scope.length === 0) return [];
    const rows = await tx
      .select({
        id: teams.id,
        name: teams.name,
        ageMin: teams.ageMin,
        ageMax: teams.ageMax,
        locationId: teams.locationId,
        branchName: branches.name,
      })
      .from(teams)
      .innerJoin(locations, eq(locations.id, teams.locationId))
      .innerJoin(branches, eq(branches.id, locations.branchId))
      .where(and(isNull(teams.archivedAt), scope ? inArray(teams.id, scope) : undefined))
      .orderBy(asc(teams.ageMin), asc(teams.name));
    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await tx
          .select({ teamId: teamPlayers.teamId, n: sql<number>`count(*)::int` })
          .from(teamPlayers)
          .innerJoin(players, eq(players.id, teamPlayers.playerId))
          .where(and(inArray(teamPlayers.teamId, ids), eq(players.status, "active")))
          .groupBy(teamPlayers.teamId)
      : [];
    const coaches = rows.length
      ? await tx
          .select({ teamId: teamCoaches.teamId, name: users.name })
          .from(teamCoaches)
          .innerJoin(memberships, eq(memberships.id, teamCoaches.membershipId))
          .innerJoin(users, eq(users.id, memberships.userId))
          .where(inArray(teamCoaches.teamId, ids))
      : [];
    return rows.map((r) => ({
      ...r,
      playerCount: counts.find((c) => c.teamId === r.id)?.n ?? 0,
      coaches: coaches.filter((c) => c.teamId === r.id).map((c) => c.name),
    }));
  });
}

export async function getTeam(ctx: AcademyContext, id: string): Promise<TeamSummary> {
  const team = (await listTeams(ctx)).find((t) => t.id === id);
  if (!team) throw notFound("Tim");
  return team;
}

type TeamData = z.infer<typeof TeamInput>;

function duplicateName(error: unknown): never {
  const code = (error as { cause?: { code?: string }; code?: string })?.cause?.code ?? (error as { code?: string })?.code;
  if (code === "23505") {
    throw new AppError(409, "duplicate", "Nama tim sudah dipakai.", { name: "Nama tim sudah dipakai. Pilih nama lain." });
  }
  throw error;
}

/** Lokasi tim: yang dipilih (harus di cabang staf), atau lokasi utama cabang staf / akademi. */
async function pickLocation(ctx: AcademyContext, tx: Tx, locationId: string | null): Promise<{ id: string }> {
  const rows = await tx
    .select({ id: locations.id, branchId: locations.branchId, isPrimary: locations.isPrimary })
    .from(locations)
    .where(isNull(locations.archivedAt));
  const allowed = rows.filter((r) => ctx.branchIds === null || ctx.branchIds.includes(r.branchId));
  if (locationId) {
    const found = allowed.find((r) => r.id === locationId);
    if (!found) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { locationId: "Lokasi tidak ditemukan." });
    return found;
  }
  const loc = allowed.find((r) => r.isPrimary) ?? allowed[0];
  if (!loc) throw new AppError(409, "no_location", "Lokasi utama akademi belum ada.");
  return loc;
}

/** Staf yang dibatasi cabang hanya boleh mengubah tim di cabangnya. */
async function assertTeamInScope(ctx: AcademyContext, tx: Tx, id: string) {
  if (ctx.branchIds === null) return;
  if (!(await teamIdsInBranches(tx, ctx.branchIds)).includes(id)) throw notFound("Tim");
}

export async function createTeam(ctx: AcademyContext, input: TeamData): Promise<string> {
  requirePermission(ctx, "teams.manage");
  return inAcademy(ctx, async (tx) => {
    const loc = await pickLocation(ctx, tx, input.locationId ?? null);
    const [row] = await tx
      .insert(teams)
      .values({ businessId: ctx.businessId, locationId: loc.id, name: input.name, ageMin: input.ageMin, ageMax: input.ageMax })
      .returning({ id: teams.id })
      .catch(duplicateName);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "team.created",
      targetType: "team",
      targetId: row!.id,
    });
    return row!.id;
  });
}

export async function updateTeam(ctx: AcademyContext, id: string, input: TeamData): Promise<void> {
  requirePermission(ctx, "teams.manage");
  await inAcademy(ctx, async (tx) => {
    await assertTeamInScope(ctx, tx, id);
    const loc = input.locationId ? await pickLocation(ctx, tx, input.locationId) : null;
    const updated = await tx
      .update(teams)
      .set({ name: input.name, ageMin: input.ageMin, ageMax: input.ageMax, ...(loc ? { locationId: loc.id } : {}) })
      .where(and(eq(teams.id, id), isNull(teams.archivedAt)))
      .returning({ id: teams.id })
      .catch(duplicateName);
    if (updated.length === 0) throw notFound("Tim");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "team.updated",
      targetType: "team",
      targetId: id,
    });
  });
}

/** Tim diarsipkan, bukan dihapus: riwayat latihan dan absensi tetap utuh. Pemain tidak ikut terhapus. */
export async function archiveTeam(ctx: AcademyContext, id: string): Promise<void> {
  requirePermission(ctx, "teams.manage");
  await inAcademy(ctx, async (tx) => {
    await assertTeamInScope(ctx, tx, id);
    const updated = await tx
      .update(teams)
      .set({ archivedAt: new Date() })
      .where(and(eq(teams.id, id), isNull(teams.archivedAt)))
      .returning({ id: teams.id });
    if (updated.length === 0) throw notFound("Tim");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "team.archived",
      targetType: "team",
      targetId: id,
    });
  });
}
