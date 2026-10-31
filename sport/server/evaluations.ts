import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { EvaluationInput } from "@/lib/schemas";
import { inAcademy, requirePermission, type AcademyContext, requireModule } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { visiblePlayerIds } from "./players";

export interface EvaluationRow {
  id: string;
  period: string;
  technique: number;
  tactics: number;
  fitness: number;
  attitude: number;
  strengths: string;
  focus: string;
  status: "draft" | "sent";
  authorName: string | null;
  /** Tanggal (YYYY-MM-DD) menurut zona waktu akademi. */
  date: string;
  /** Staf ini boleh mengubah, mengirim, atau menghapus draf ini. */
  canEdit: boolean;
}

async function assertPlayer(ctx: AcademyContext, tx: Tx, playerId: string): Promise<void> {
  const scope = await visiblePlayerIds(ctx, tx);
  const [row] = (await tx.execute(sql`SELECT 1 FROM bola.players WHERE id = ${playerId}::uuid`)) as unknown as unknown[];
  // Di luar cakupan diperlakukan seperti tidak ada.
  if (!row || (scope && !scope.includes(playerId))) throw notFound("Pemain");
}

/** Draf yang boleh diubah staf ini; rapor yang sudah terkirim tidak bisa diubah lagi. */
async function loadDraft(ctx: AcademyContext, tx: Tx, id: string) {
  const [row] = (await tx.execute(sql`
    SELECT player_id AS "playerId", author_id AS "authorId", status FROM bola.evaluations WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as {
    playerId: string; authorId: string | null; status: "draft" | "sent";
  }[];
  if (!row) throw notFound("Rapor");
  await assertPlayer(ctx, tx, row.playerId);
  if (row.authorId !== ctx.userId && !ctx.can("evaluations.manage_all")) throw forbidden();
  if (row.status === "sent") throw new AppError(409, "already_sent", "Rapor yang sudah dikirim tidak bisa diubah.");
  return row;
}

export async function listEvaluations(ctx: AcademyContext, playerId: string): Promise<EvaluationRow[]> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  return inAcademy(ctx, async (tx) => {
    await assertPlayer(ctx, tx, playerId);
    const rows = (await tx.execute(sql`
      SELECT e.id, e.period, e.technique, e.tactics, e.fitness, e.attitude, e.strengths, e.focus, e.status,
             u.name AS "authorName", e.author_id AS "authorId",
             to_char(coalesce(e.sent_at, e.created_at) AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date
      FROM bola.evaluations e
      JOIN core.businesses b ON b.id = e.business_id
      LEFT JOIN core.users u ON u.id = e.author_id
      WHERE e.player_id = ${playerId}::uuid
      ORDER BY e.created_at DESC LIMIT 20`)) as unknown as (Omit<EvaluationRow, "canEdit"> & { authorId: string | null })[];
    return rows.map(({ authorId, ...r }) => ({
      ...r,
      canEdit: r.status === "draft" && (authorId === ctx.userId || ctx.can("evaluations.manage_all")),
    }));
  });
}

export async function createEvaluation(ctx: AcademyContext, playerId: string, input: z.infer<typeof EvaluationInput>): Promise<string> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  return inAcademy(ctx, async (tx) => {
    await assertPlayer(ctx, tx, playerId);
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.evaluations (business_id, player_id, period, technique, tactics, fitness, attitude, strengths, focus,
                                    status, sent_at, author_id)
      VALUES (${ctx.businessId}::uuid, ${playerId}::uuid, ${input.period}, ${input.technique}, ${input.tactics}, ${input.fitness},
              ${input.attitude}, ${input.strengths}, ${input.focus},
              ${input.send ? "sent" : "draft"}::bola.evaluation_status, ${input.send ? sql`now()` : sql`NULL`}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId,
      actorUserId: ctx.userId,
      action: input.send ? "evaluation.sent" : "evaluation.drafted",
      targetType: "evaluation",
      targetId: row!.id,
      meta: { playerId },
    });
    return row!.id;
  });
}

export async function updateEvaluation(ctx: AcademyContext, id: string, input: z.infer<typeof EvaluationInput>): Promise<void> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  await inAcademy(ctx, async (tx) => {
    await loadDraft(ctx, tx, id);
    await tx.execute(sql`
      UPDATE bola.evaluations
      SET period = ${input.period}, technique = ${input.technique}, tactics = ${input.tactics}, fitness = ${input.fitness},
          attitude = ${input.attitude}, strengths = ${input.strengths}, focus = ${input.focus}, updated_at = now(),
          status = ${input.send ? "sent" : "draft"}::bola.evaluation_status, sent_at = ${input.send ? sql`now()` : sql`NULL`}
      WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: input.send ? "evaluation.sent" : "evaluation.updated",
      targetType: "evaluation", targetId: id,
    });
  });
}

export async function sendEvaluation(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  await inAcademy(ctx, async (tx) => {
    await loadDraft(ctx, tx, id);
    await tx.execute(sql`UPDATE bola.evaluations SET status = 'sent', sent_at = now(), updated_at = now() WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "evaluation.sent", targetType: "evaluation", targetId: id,
    });
  });
}

export async function deleteEvaluation(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  await inAcademy(ctx, async (tx) => {
    await loadDraft(ctx, tx, id);
    await tx.execute(sql`DELETE FROM bola.evaluations WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "evaluation.deleted", targetType: "evaluation", targetId: id,
    });
  });
}

/** Rapor yang sudah dikirim ke pemain ini, terbaru dulu. Draf tidak pernah ikut. */
export async function evaluationsForPlayer(tx: Tx, playerId: string) {
  return (await tx.execute(sql`
    SELECT e.id, e.period, e.technique, e.tactics, e.fitness, e.attitude, e.strengths, e.focus, u.name AS "authorName",
           to_char(e.sent_at AT TIME ZONE b.timezone, 'YYYY-MM-DD') AS date
    FROM bola.evaluations e
    JOIN core.businesses b ON b.id = e.business_id
    LEFT JOIN core.users u ON u.id = e.author_id
    WHERE e.player_id = ${playerId}::uuid AND e.status = 'sent'
    ORDER BY e.sent_at DESC LIMIT 6`)) as unknown as Pick<EvaluationRow, "id" | "period" | "technique" | "tactics" | "fitness" | "attitude" | "strengths" | "focus" | "authorName" | "date">[];
}
