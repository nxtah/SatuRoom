import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import { defaultTemplate, type Metric } from "@/lib/assessment-defaults";
import type { AssessmentInput, GoalInput, TemplateInput } from "@/lib/schemas";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { visiblePlayerIds } from "./players";

export type TemplateStatus = "draft" | "published" | "archived";

export interface TemplateRow {
  id: string;
  familyId: string;
  version: number;
  name: string;
  description: string | null;
  metrics: Metric[];
  status: TemplateStatus;
  publishedAt: string | null;
  used: number;
}

/** Satu baris per template (keluarga): versi terbit dan draf terbarunya. */
export interface TemplateFamily {
  familyId: string;
  name: string;
  published: TemplateRow | null;
  draft: TemplateRow | null;
  versions: number;
}

const TEMPLATE_COLUMNS = sql`
  t.id, t.family_id AS "familyId", t.version, t.name, t.description, t.metrics, t.status,
  to_char(t.published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "publishedAt",
  (SELECT count(*)::int FROM bola.assessments a WHERE a.template_id = t.id) AS used`;

function audit(ctx: AcademyContext, tx: Tx, action: string, targetType: string, targetId: string, meta: Record<string, unknown> = {}) {
  return tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action, targetType, targetId, meta });
}

// ---------- Template ----------

export async function listTemplates(ctx: AcademyContext): Promise<TemplateFamily[]> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  return inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT ${TEMPLATE_COLUMNS} FROM bola.assessment_templates t
      WHERE t.status <> 'archived' OR t.version = (SELECT max(version) FROM bola.assessment_templates x WHERE x.family_id = t.family_id)
      ORDER BY t.created_at`)) as unknown as TemplateRow[];
    const counts = (await tx.execute(sql`
      SELECT family_id AS "familyId", count(*)::int AS n FROM bola.assessment_templates GROUP BY family_id`)) as unknown as { familyId: string; n: number }[];
    const families = new Map<string, TemplateFamily>();
    for (const r of rows) {
      const f = families.get(r.familyId) ?? { familyId: r.familyId, name: r.name, published: null, draft: null, versions: 0 };
      if (r.status === "published") f.published = r;
      if (r.status === "draft") f.draft = r;
      f.name = (f.published ?? f.draft ?? r).name;
      f.versions = counts.find((c) => c.familyId === r.familyId)?.n ?? 1;
      families.set(r.familyId, f);
    }
    return [...families.values()].filter((f) => f.published || f.draft);
  });
}

/** Template terbit, untuk form penilaian. */
export async function publishedTemplates(ctx: AcademyContext): Promise<TemplateRow[]> {
  if (!ctx.modules.has("evaluations")) return [];
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`SELECT ${TEMPLATE_COLUMNS} FROM bola.assessment_templates t WHERE t.status = 'published' ORDER BY t.name`)) as unknown as TemplateRow[],
  );
}

function canManageTemplates(ctx: AcademyContext) {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.manage_all");
}

export async function createTemplate(ctx: AcademyContext, input: z.infer<typeof TemplateInput>): Promise<string> {
  canManageTemplates(ctx);
  return inAcademy(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`
      WITH id AS (SELECT gen_random_uuid() AS v)
      INSERT INTO bola.assessment_templates (id, business_id, family_id, version, name, description, metrics, created_by)
      SELECT id.v, ${ctx.businessId}::uuid, id.v, 1, ${input.name}, ${input.description ?? null}, ${JSON.stringify(input.metrics)}::jsonb, ${ctx.userId}::uuid
      FROM id RETURNING id`)) as unknown as { id: string }[];
    await audit(ctx, tx, "template.created", "assessment_template", row!.id, { name: input.name });
    return row!.id;
  });
}

/** Membuat template bawaan cabang olahraga akademi (langsung terbit). */
export async function createDefaultTemplate(ctx: AcademyContext): Promise<string> {
  canManageTemplates(ctx);
  const id = await createTemplate(ctx, defaultTemplate(ctx.sport));
  await publishTemplate(ctx, id);
  return id;
}

/**
 * Mengubah template. Draf diubah langsung; versi terbit tidak disentuh: perubahan menjadi draf
 * versi berikutnya (atau mengganti draf yang sudah ada). Mengembalikan id draf.
 */
export async function updateTemplate(ctx: AcademyContext, id: string, input: z.infer<typeof TemplateInput>): Promise<string> {
  canManageTemplates(ctx);
  return inAcademy(ctx, async (tx) => {
    const [t] = (await tx.execute(sql`
      SELECT family_id AS "familyId", status FROM bola.assessment_templates WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { familyId: string; status: TemplateStatus }[];
    if (!t) throw notFound("Template");
    if (t.status === "archived") throw new AppError(409, "archived", "Template ini sudah diarsipkan.");
    const [draft] = (await tx.execute(sql`
      SELECT id FROM bola.assessment_templates WHERE family_id = ${t.familyId}::uuid AND status = 'draft'`)) as unknown as { id: string }[];
    let draftId: string;
    if (draft) {
      await tx.execute(sql`
        UPDATE bola.assessment_templates SET name = ${input.name}, description = ${input.description ?? null}, metrics = ${JSON.stringify(input.metrics)}::jsonb
        WHERE id = ${draft.id}::uuid`);
      draftId = draft.id;
    } else {
      const [row] = (await tx.execute(sql`
        INSERT INTO bola.assessment_templates (business_id, family_id, version, name, description, metrics, created_by)
        SELECT ${ctx.businessId}::uuid, ${t.familyId}::uuid, max(version) + 1, ${input.name}, ${input.description ?? null}, ${JSON.stringify(input.metrics)}::jsonb, ${ctx.userId}::uuid
        FROM bola.assessment_templates WHERE family_id = ${t.familyId}::uuid
        RETURNING id`)) as unknown as { id: string }[];
      draftId = row!.id;
    }
    await audit(ctx, tx, "template.updated", "assessment_template", draftId);
    return draftId;
  });
}

/** Menerbitkan draf; versi terbit sebelumnya diarsipkan (hasil lama tetap memakai versinya). */
export async function publishTemplate(ctx: AcademyContext, id: string): Promise<void> {
  canManageTemplates(ctx);
  await inAcademy(ctx, async (tx) => {
    const [t] = (await tx.execute(sql`
      SELECT family_id AS "familyId", status FROM bola.assessment_templates WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { familyId: string; status: TemplateStatus }[];
    if (!t) throw notFound("Template");
    if (t.status !== "draft") throw new AppError(409, "not_draft", "Hanya draf yang bisa diterbitkan.");
    await tx.execute(sql`UPDATE bola.assessment_templates SET status = 'archived' WHERE family_id = ${t.familyId}::uuid AND status = 'published'`);
    await tx.execute(sql`UPDATE bola.assessment_templates SET status = 'published', published_at = now() WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "template.published", "assessment_template", id);
  });
}

/** Mengarsipkan seluruh template (semua versi). Draf yang belum pernah terbit dihapus. */
export async function archiveTemplate(ctx: AcademyContext, id: string): Promise<void> {
  canManageTemplates(ctx);
  await inAcademy(ctx, async (tx) => {
    const [t] = (await tx.execute(sql`SELECT family_id AS "familyId" FROM bola.assessment_templates WHERE id = ${id}::uuid`)) as unknown as { familyId: string }[];
    if (!t) throw notFound("Template");
    await tx.execute(sql`
      DELETE FROM bola.assessment_templates t WHERE t.family_id = ${t.familyId}::uuid AND t.status = 'draft'
        AND NOT EXISTS (SELECT 1 FROM bola.assessments a WHERE a.template_id = t.id)`);
    await tx.execute(sql`UPDATE bola.assessment_templates SET status = 'archived' WHERE family_id = ${t.familyId}::uuid`);
    await audit(ctx, tx, "template.archived", "assessment_template", id);
  });
}

// ---------- Penilaian pemain ----------

async function assertPlayer(ctx: AcademyContext, tx: Tx, playerId: string) {
  const scope = await visiblePlayerIds(ctx, tx);
  const [row] = (await tx.execute(sql`SELECT 1 AS x FROM bola.players WHERE id = ${playerId}::uuid`)) as unknown as unknown[];
  if (!row || (scope && !scope.includes(playerId))) throw notFound("Pemain");
}

/** Memastikan nilai cocok dengan ukuran template; mengembalikan nilai yang bersih. */
function cleanValues(metrics: Metric[], values: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  const fields: Record<string, string> = {};
  for (const m of metrics) {
    const v = values[m.key];
    if (v === undefined || Number.isNaN(v)) continue;
    if (m.type === "rating" && (!Number.isInteger(v) || v < 1 || v > 5)) fields[m.key] = "Beri nilai 1 sampai 5.";
    else if (m.type === "number" && (v < 0 || v > 100000)) fields[m.key] = "Angka tidak masuk akal.";
    else out[m.key] = m.type === "number" ? Math.round(v * 100) / 100 : v;
  }
  if (Object.keys(fields).length) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", fields);
  if (!Object.keys(out).length) throw new AppError(422, "invalid", "Isi minimal satu nilai.");
  return out;
}

export interface AssessmentRow {
  id: string;
  templateId: string;
  familyId: string;
  templateName: string;
  version: number;
  metrics: Metric[];
  assessedOn: string;
  values: Record<string, number>;
  note: string | null;
  status: "draft" | "sent";
  authorName: string | null;
  canEdit: boolean;
}

async function rowsFor(tx: Tx, playerId: string, sentOnly: boolean) {
  return (await tx.execute(sql`
    SELECT a.id, a.template_id AS "templateId", t.family_id AS "familyId", t.name AS "templateName", t.version, t.metrics,
           to_char(a.assessed_on, 'YYYY-MM-DD') AS "assessedOn", a."values", a.note, a.status,
           u.name AS "authorName", a.author_id AS "authorId"
    FROM bola.assessments a
    JOIN bola.assessment_templates t ON t.id = a.template_id
    LEFT JOIN core.users u ON u.id = a.author_id
    WHERE a.player_id = ${playerId}::uuid ${sentOnly ? sql`AND a.status = 'sent'` : sql``}
    ORDER BY a.assessed_on DESC, a.created_at DESC LIMIT 30`)) as unknown as (Omit<AssessmentRow, "canEdit"> & { authorId: string | null })[];
}

export async function listAssessments(ctx: AcademyContext, playerId: string): Promise<AssessmentRow[]> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  return inAcademy(ctx, async (tx) => {
    await assertPlayer(ctx, tx, playerId);
    return (await rowsFor(tx, playerId, false)).map(({ authorId, ...r }) => ({
      ...r,
      canEdit: r.status === "draft" && (authorId === ctx.userId || ctx.can("evaluations.manage_all")),
    }));
  });
}

export async function createAssessment(ctx: AcademyContext, playerId: string, input: z.infer<typeof AssessmentInput>): Promise<string> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  return inAcademy(ctx, async (tx) => {
    await assertPlayer(ctx, tx, playerId);
    const [t] = (await tx.execute(sql`
      SELECT metrics FROM bola.assessment_templates WHERE id = ${input.templateId}::uuid AND status = 'published'`)) as unknown as { metrics: Metric[] }[];
    if (!t) throw new AppError(422, "invalid", "Pilih template yang sudah terbit.", { templateId: "Template tidak tersedia." });
    const values = cleanValues(t.metrics, input.values);
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.assessments (business_id, player_id, template_id, assessed_on, "values", note, status, sent_at, author_id)
      VALUES (${ctx.businessId}::uuid, ${playerId}::uuid, ${input.templateId}::uuid, ${input.assessedOn}::date,
              ${JSON.stringify(values)}::jsonb, ${input.note ?? null},
              ${input.send ? "sent" : "draft"}::bola.evaluation_status, ${input.send ? sql`now()` : sql`NULL`}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await audit(ctx, tx, input.send ? "assessment.sent" : "assessment.drafted", "assessment", row!.id, { playerId });
    return row!.id;
  });
}

async function loadDraft(ctx: AcademyContext, tx: Tx, id: string) {
  const [a] = (await tx.execute(sql`
    SELECT a.player_id AS "playerId", a.author_id AS "authorId", a.status, t.metrics
    FROM bola.assessments a JOIN bola.assessment_templates t ON t.id = a.template_id
    WHERE a.id = ${id}::uuid FOR UPDATE OF a`)) as unknown as { playerId: string; authorId: string | null; status: "draft" | "sent"; metrics: Metric[] }[];
  if (!a) throw notFound("Penilaian");
  await assertPlayer(ctx, tx, a.playerId);
  if (a.authorId !== ctx.userId && !ctx.can("evaluations.manage_all")) throw forbidden();
  if (a.status === "sent") throw new AppError(409, "already_sent", "Penilaian yang sudah dikirim tidak bisa diubah.");
  return a;
}

export async function sendAssessment(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  await inAcademy(ctx, async (tx) => {
    await loadDraft(ctx, tx, id);
    await tx.execute(sql`UPDATE bola.assessments SET status = 'sent', sent_at = now() WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "assessment.sent", "assessment", id);
  });
}

export async function deleteAssessment(ctx: AcademyContext, id: string): Promise<void> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  await inAcademy(ctx, async (tx) => {
    await loadDraft(ctx, tx, id);
    await tx.execute(sql`DELETE FROM bola.assessments WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "assessment.deleted", "assessment", id);
  });
}

export interface Progress {
  key: string;
  label: string;
  unit: string | null;
  type: Metric["type"];
  latest: number;
  previous: number | null;
  /** improved, worse, same, atau null bila belum ada pembanding. */
  trend: "improved" | "worse" | "same" | null;
  history: { date: string; value: number }[];
}

/** Perkembangan tiap ukuran dari penilaian terkirim (dicocokkan lewat kode ukuran lintas versi). */
export function progressOf(rows: Pick<AssessmentRow, "assessedOn" | "values" | "metrics" | "status">[]): Progress[] {
  const sent = rows.filter((r) => r.status === "sent").sort((a, b) => a.assessedOn.localeCompare(b.assessedOn));
  const out = new Map<string, Progress>();
  for (const r of sent) {
    for (const m of r.metrics) {
      const v = r.values[m.key];
      if (v === undefined) continue;
      const p = out.get(m.key) ?? { key: m.key, label: m.label, unit: m.unit ?? null, type: m.type, latest: v, previous: null, trend: null, history: [] };
      p.history.push({ date: r.assessedOn, value: v });
      p.previous = p.history.length > 1 ? p.history.at(-2)!.value : null;
      p.latest = v;
      p.label = m.label;
      p.trend = p.previous === null ? null : v === p.previous ? "same" : (v > p.previous) === (m.better === "higher") ? "improved" : "worse";
      out.set(m.key, p);
    }
  }
  return [...out.values()];
}

// ---------- Target perkembangan ----------

export interface GoalRow {
  id: string;
  title: string;
  detail: string | null;
  dueOn: string | null;
  status: "open" | "achieved" | "dropped";
  shared: boolean;
  authorName: string | null;
}

const GOAL_COLUMNS = sql`
  g.id, g.title, g.detail, to_char(g.due_on, 'YYYY-MM-DD') AS "dueOn", g.status, g.shared, u.name AS "authorName"`;

export async function listGoals(ctx: AcademyContext, playerId: string): Promise<GoalRow[]> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  return inAcademy(ctx, async (tx) => {
    await assertPlayer(ctx, tx, playerId);
    return (await tx.execute(sql`
      SELECT ${GOAL_COLUMNS} FROM bola.development_goals g LEFT JOIN core.users u ON u.id = g.created_by
      WHERE g.player_id = ${playerId}::uuid
      ORDER BY (g.status = 'open') DESC, g.due_on NULLS LAST, g.created_at DESC`)) as unknown as GoalRow[];
  });
}

export async function createGoal(ctx: AcademyContext, playerId: string, input: z.infer<typeof GoalInput>): Promise<string> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  return inAcademy(ctx, async (tx) => {
    await assertPlayer(ctx, tx, playerId);
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.development_goals (business_id, player_id, title, detail, due_on, shared, created_by)
      VALUES (${ctx.businessId}::uuid, ${playerId}::uuid, ${input.title}, ${input.detail ?? null}, ${input.dueOn ?? null}::date, ${input.shared}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await audit(ctx, tx, "goal.created", "goal", row!.id, { playerId });
    return row!.id;
  });
}

export async function setGoalStatus(ctx: AcademyContext, id: string, status: GoalRow["status"]): Promise<void> {
  requireModule(ctx, "evaluations");
  requirePermission(ctx, "evaluations.write");
  await inAcademy(ctx, async (tx) => {
    const [g] = (await tx.execute(sql`SELECT player_id AS "playerId" FROM bola.development_goals WHERE id = ${id}::uuid`)) as unknown as { playerId: string }[];
    if (!g) throw notFound("Target");
    await assertPlayer(ctx, tx, g.playerId);
    await tx.execute(sql`
      UPDATE bola.development_goals SET status = ${status}::bola.goal_status,
        closed_at = CASE WHEN ${status} = 'open' THEN NULL ELSE now() END
      WHERE id = ${id}::uuid`);
    await audit(ctx, tx, `goal.${status}`, "goal", id);
  });
}

// ---------- Untuk akun pemain/orang tua ----------

export async function assessmentsForPlayer(tx: Tx, playerId: string) {
  const rows = await rowsFor(tx, playerId, true);
  const goals = (await tx.execute(sql`
    SELECT ${GOAL_COLUMNS} FROM bola.development_goals g LEFT JOIN core.users u ON u.id = g.created_by
    WHERE g.player_id = ${playerId}::uuid AND g.shared AND g.status <> 'dropped'
    ORDER BY (g.status = 'open') DESC, g.due_on NULLS LAST`)) as unknown as GoalRow[];
  return {
    latest: rows.slice(0, 3).map(({ authorId: _a, ...r }) => r),
    progress: progressOf(rows),
    goals,
  };
}
