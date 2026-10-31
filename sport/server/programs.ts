import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { ProgramInput } from "@/lib/schemas";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { visibleTeamIds } from "./teams";

export interface ProgramRow {
  id: string;
  name: string;
  level: string | null;
  description: string | null;
  monthlyFee: number | null;
  teams: { id: string; name: string; players: number }[];
}

const clash = (e: unknown) => (e as { cause?: { code?: string } })?.cause?.code === "23505";
const duplicate = () => new AppError(409, "duplicate", "Nama program sudah dipakai.", { name: "Nama program sudah dipakai." });

/** Program aktif beserta tim yang terlihat oleh peminta. */
export async function listPrograms(ctx: AcademyContext): Promise<ProgramRow[]> {
  requireModule(ctx, "programs");
  return inAcademy(ctx, async (tx) => {
    const scope = await visibleTeamIds(ctx, tx);
    const progs = (await tx.execute(sql`
      SELECT id, name, level, description, monthly_fee AS "monthlyFee"
      FROM bola.programs WHERE archived_at IS NULL ORDER BY lower(name)`)) as unknown as Omit<ProgramRow, "teams">[];
    const teams = (await tx.execute(sql`
      SELECT t.id, t.name, t.program_id AS "programId",
        (SELECT count(*)::int FROM bola.team_players tp JOIN bola.players p ON p.id = tp.player_id
          WHERE tp.team_id = t.id AND p.status = 'active') AS players
      FROM bola.teams t WHERE t.archived_at IS NULL AND t.program_id IS NOT NULL
      ORDER BY t.age_min NULLS LAST, t.name`)) as unknown as { id: string; name: string; programId: string; players: number }[];
    return progs.map((p) => ({
      ...p,
      teams: teams.filter((t) => t.programId === p.id && (!scope || scope.includes(t.id))).map(({ id, name, players }) => ({ id, name, players })),
    }));
  });
}

/** Pilihan program untuk form tim; kosong bila modul mati. */
export async function programOptions(ctx: AcademyContext): Promise<{ id: string; name: string; monthlyFee: number | null }[]> {
  if (!ctx.modules.has("programs")) return [];
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT id, CASE WHEN level IS NULL THEN name ELSE name || ' · ' || level END AS name, monthly_fee AS "monthlyFee"
      FROM bola.programs WHERE archived_at IS NULL ORDER BY lower(name)`)) as unknown as { id: string; name: string; monthlyFee: number | null }[],
  );
}

export async function createProgram(ctx: AcademyContext, input: z.infer<typeof ProgramInput>): Promise<string> {
  requireModule(ctx, "programs");
  requirePermission(ctx, "programs.manage");
  try {
    return await inAcademy(ctx, async (tx) => {
      const [row] = (await tx.execute(sql`
        INSERT INTO bola.programs (business_id, name, level, description, monthly_fee)
        VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.level ?? null}, ${input.description ?? null}, ${input.monthlyFee ?? null})
        RETURNING id`)) as unknown as { id: string }[];
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "program.created", targetType: "program", targetId: row!.id, meta: { name: input.name } });
      return row!.id;
    });
  } catch (e) {
    if (clash(e)) throw duplicate();
    throw e;
  }
}

export async function updateProgram(ctx: AcademyContext, id: string, input: z.infer<typeof ProgramInput>): Promise<void> {
  requireModule(ctx, "programs");
  requirePermission(ctx, "programs.manage");
  try {
    await inAcademy(ctx, async (tx) => {
      const rows = (await tx.execute(sql`
        UPDATE bola.programs SET name = ${input.name}, level = ${input.level ?? null},
          description = ${input.description ?? null}, monthly_fee = ${input.monthlyFee ?? null}
        WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
      if (!rows.length) throw notFound("Program");
      await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "program.updated", targetType: "program", targetId: id });
    });
  } catch (e) {
    if (clash(e)) throw duplicate();
    throw e;
  }
}

/** Mengarsipkan program; tim yang memakainya dilepas dari program (tim tetap ada). */
export async function archiveProgram(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "programs");
  requirePermission(ctx, "programs.manage");
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE bola.programs SET archived_at = now() WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Program");
    await tx.execute(sql`UPDATE bola.teams SET program_id = NULL WHERE program_id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "program.archived", targetType: "program", targetId: id });
  });
}
