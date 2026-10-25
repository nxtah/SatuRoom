import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents, memberships, users } from "@saturoom/core/schema";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { z } from "zod";
import type { TeamInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { locations, players, teamCoaches, teamPlayers, teams } from "./schema";

/**
 * Tim yang boleh dilihat: semua tim untuk peran dengan izin `teams.read_all`, atau hanya tim
 * yang ditugaskan untuk pelatih. `null` berarti tanpa batas.
 */
export async function visibleTeamIds(ctx: AcademyContext, tx: Tx): Promise<string[] | null> {
  if (ctx.can("teams.read_all")) return null;
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
      })
      .from(teams)
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

export async function createTeam(ctx: AcademyContext, input: TeamData): Promise<string> {
  requirePermission(ctx, "teams.manage");
  return inAcademy(ctx, async (tx) => {
    const [loc] = await tx
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.isPrimary, true), isNull(locations.archivedAt)));
    if (!loc) throw new AppError(409, "no_location", "Lokasi utama akademi belum ada.");
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
    const updated = await tx
      .update(teams)
      .set({ name: input.name, ageMin: input.ageMin, ageMax: input.ageMax })
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
