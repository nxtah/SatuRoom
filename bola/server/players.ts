import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { and, asc, eq, ilike, inArray, isNull } from "drizzle-orm";
import type { z } from "zod";
import type { PlayerInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { players, teamPlayers, teams } from "./schema";
import { visibleTeamIds } from "./teams";

export interface PlayerRow {
  id: string;
  fullName: string;
  birthDate: string;
  position: "kiper" | "belakang" | "tengah" | "depan" | null;
  shirtNumber: number | null;
  status: "active" | "inactive";
  teams: { id: string; name: string }[];
}

export interface PlayerDetail extends PlayerRow {
  /** null bila peminta tidak berhak melihat kontak wali (bukan berarti kosong). */
  guardian: { name: string | null; phone: string | null } | null;
}

export interface PlayerFilter {
  q?: string;
  teamId?: string;
  status?: "active" | "inactive";
}

/** Id pemain yang boleh dilihat; null = semua pemain akademi. */
export async function visiblePlayerIds(ctx: AcademyContext, tx: Tx): Promise<string[] | null> {
  if (ctx.can("players.read_all")) return null;
  const scope = (await visibleTeamIds(ctx, tx)) ?? [];
  if (scope.length === 0) return [];
  const rows = await tx
    .selectDistinct({ id: teamPlayers.playerId })
    .from(teamPlayers)
    .where(inArray(teamPlayers.teamId, scope));
  return rows.map((r) => r.id);
}

async function teamsOf(tx: Tx, ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; name: string }[]>();
  const rows = await tx
    .select({ playerId: teamPlayers.playerId, id: teams.id, name: teams.name })
    .from(teamPlayers)
    .innerJoin(teams, eq(teams.id, teamPlayers.teamId))
    .where(and(inArray(teamPlayers.playerId, ids), isNull(teams.archivedAt)))
    .orderBy(asc(teams.name));
  const map = new Map<string, { id: string; name: string }[]>();
  for (const r of rows) map.set(r.playerId, [...(map.get(r.playerId) ?? []), { id: r.id, name: r.name }]);
  return map;
}

const base = {
  id: players.id,
  fullName: players.fullName,
  birthDate: players.birthDate,
  position: players.position,
  shirtNumber: players.shirtNumber,
  status: players.status,
};

export function listPlayers(ctx: AcademyContext, filter: PlayerFilter = {}): Promise<PlayerRow[]> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visiblePlayerIds(ctx, tx);
    if (scope && scope.length === 0) return [];
    const q = filter.q?.trim();
    const rows = await tx
      .select(base)
      .from(players)
      .where(
        and(
          scope ? inArray(players.id, scope) : undefined,
          eq(players.status, filter.status ?? "active"),
          q ? ilike(players.fullName, `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`) : undefined,
          filter.teamId
            ? inArray(
                players.id,
                tx.select({ id: teamPlayers.playerId }).from(teamPlayers).where(eq(teamPlayers.teamId, filter.teamId)),
              )
            : undefined,
        ),
      )
      .orderBy(asc(players.fullName))
      .limit(500);
    const byPlayer = await teamsOf(tx, rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, teams: byPlayer.get(r.id) ?? [] }));
  });
}

export function getPlayer(ctx: AcademyContext, id: string): Promise<PlayerDetail> {
  return inAcademy(ctx, async (tx) => {
    const scope = await visiblePlayerIds(ctx, tx);
    if (scope && !scope.includes(id)) throw notFound("Pemain");
    const [row] = await tx
      .select({ ...base, guardianName: players.guardianName, guardianPhone: players.guardianPhone })
      .from(players)
      .where(eq(players.id, id));
    if (!row) throw notFound("Pemain");
    const { guardianName, guardianPhone, ...rest } = row;
    return {
      ...rest,
      teams: (await teamsOf(tx, [id])).get(id) ?? [],
      guardian: ctx.can("guardians.read") ? { name: guardianName, phone: guardianPhone } : null,
    };
  });
}

type PlayerData = z.infer<typeof PlayerInput>;

/** Peran tanpa izin kontak wali tidak boleh mengirim kolom wali sama sekali. */
function guardianFields(ctx: AcademyContext, input: PlayerData) {
  const sent = input.guardianName !== undefined || input.guardianPhone !== undefined;
  if (!ctx.can("guardians.read")) {
    if (sent) throw forbidden();
    return {};
  }
  return { guardianName: input.guardianName ?? null, guardianPhone: input.guardianPhone ?? null };
}

/** Semua tim yang dipilih harus tim aktif milik akademi ini (RLS menyaring akademi lain). */
async function assertTeams(tx: Tx, ids: string[]) {
  const found = await tx
    .select({ id: teams.id })
    .from(teams)
    .where(and(inArray(teams.id, ids), isNull(teams.archivedAt)));
  if (found.length !== new Set(ids).size) {
    throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { teamIds: "Tim tidak ditemukan." });
  }
}

export async function createPlayer(ctx: AcademyContext, input: PlayerData): Promise<string> {
  requirePermission(ctx, "players.manage");
  return inAcademy(ctx, (tx) => createPlayerIn(ctx, tx, input));
}

/** Isi createPlayer di dalam transaksi milik pemanggil, supaya bisa digabung dengan langkah lain. */
export async function createPlayerIn(ctx: AcademyContext, tx: Tx, input: PlayerData): Promise<string> {
  await assertTeams(tx, input.teamIds);
  const [row] = await tx
    .insert(players)
    .values({
      businessId: ctx.businessId,
      fullName: input.fullName,
      birthDate: input.birthDate,
      position: input.position ?? null,
      shirtNumber: input.shirtNumber ?? null,
      ...guardianFields(ctx, input),
      createdBy: ctx.userId,
    })
    .returning({ id: players.id });
  const id = row!.id;
  await tx
    .insert(teamPlayers)
    .values([...new Set(input.teamIds)].map((teamId) => ({ businessId: ctx.businessId, teamId, playerId: id })));
  await tx.insert(auditEvents).values({
    businessId: ctx.businessId,
    actorUserId: ctx.userId,
    action: "player.created",
    targetType: "player",
    targetId: id,
  });
  return id;
}

/** Pemain di luar cakupan peminta diperlakukan seperti tidak ada. */
async function assertInScope(ctx: AcademyContext, tx: Tx, id: string) {
  const scope = await visiblePlayerIds(ctx, tx);
  if (scope && !scope.includes(id)) throw notFound("Pemain");
}

export async function updatePlayer(ctx: AcademyContext, id: string, input: PlayerData): Promise<void> {
  requirePermission(ctx, "players.manage");
  await inAcademy(ctx, async (tx) => {
    await assertInScope(ctx, tx, id);
    await assertTeams(tx, input.teamIds);
    const updated = await tx
      .update(players)
      .set({
        fullName: input.fullName,
        birthDate: input.birthDate,
        position: input.position ?? null,
        shirtNumber: input.shirtNumber ?? null,
        ...guardianFields(ctx, input),
        updatedAt: new Date(),
      })
      .where(eq(players.id, id))
      .returning({ id: players.id });
    if (updated.length === 0) throw notFound("Pemain");
    // Keanggotaan tim diganti sesuai pilihan; tim yang diarsipkan tidak ikut tersentuh.
    const active = await tx.select({ id: teams.id }).from(teams).where(isNull(teams.archivedAt));
    await tx
      .delete(teamPlayers)
      .where(and(eq(teamPlayers.playerId, id), inArray(teamPlayers.teamId, active.map((t) => t.id))));
    await tx
      .insert(teamPlayers)
      .values([...new Set(input.teamIds)].map((teamId) => ({ businessId: ctx.businessId, teamId, playerId: id })));
    // Audit tanpa data pribadi: hanya siapa, kapan, dan pemain mana.
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: "player.updated",
      targetType: "player",
      targetId: id,
    });
  });
}

export async function setPlayerStatus(ctx: AcademyContext, id: string, status: "active" | "inactive"): Promise<void> {
  requirePermission(ctx, "players.manage");
  await inAcademy(ctx, async (tx) => {
    await assertInScope(ctx, tx, id);
    const updated = await tx
      .update(players)
      .set({ status, updatedAt: new Date() })
      .where(eq(players.id, id))
      .returning({ id: players.id });
    if (updated.length === 0) throw notFound("Pemain");
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: status === "active" ? "player.reactivated" : "player.deactivated",
      targetType: "player",
      targetId: id,
    });
  });
}
