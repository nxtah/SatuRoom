import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { TableGroupInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type TableGroup = { id: string; name: string; sortOrder: number; tableCount: number };
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "settings.manage")) throw forbidden(); };
const dupe = (e: unknown): never => {
  if ((e as { cause?: { code?: string } }).cause?.code === "23505") throw new AppError(409, "duplicate", "Sudah ada grup dengan nama itu.");
  throw e;
};

export function listTableGroups(ctx: FnbContext): Promise<TableGroup[]> {
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT g.id, g.name, g.sort_order AS "sortOrder", (SELECT count(*) FROM fnb.dining_tables t WHERE t.group_id = g.id AND t.archived_at IS NULL)::int AS "tableCount"
    FROM fnb.table_groups g WHERE g.archived_at IS NULL ORDER BY g.sort_order, g.name`)) as unknown as TableGroup[]);
}

export async function saveTableGroup(ctx: FnbContext, input: z.infer<typeof TableGroupInput>, id?: string): Promise<{ id: string }> {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    let out: string;
    try {
      if (id) {
        const rows = (await tx.execute(sql`UPDATE fnb.table_groups SET name = ${input.name}, sort_order = ${input.sortOrder} WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as { id: string }[];
        if (!rows.length) throw notFound("Grup meja");
        out = id;
      } else {
        const [outlet] = (await tx.execute(sql`SELECT id FROM fnb.outlets WHERE is_primary AND archived_at IS NULL LIMIT 1`)) as unknown as { id: string }[];
        if (!outlet) throw new AppError(409, "no_outlet", "Cabang belum ada.");
        const [row] = (await tx.execute(sql`INSERT INTO fnb.table_groups (business_id, outlet_id, name, sort_order) VALUES (${ctx.businessId}::uuid, ${outlet.id}::uuid, ${input.name}, ${input.sortOrder}) RETURNING id`)) as unknown as { id: string }[];
        out = row!.id;
      }
    } catch (e) {
      return dupe(e);
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: id ? "fnb.table_group.updated" : "fnb.table_group.created", targetType: "table_group", targetId: out, meta: { name: input.name } });
    return { id: out };
  });
}

/** Grup dihapus tanpa menghapus mejanya: meja di dalamnya kembali tanpa grup. */
export async function archiveTableGroup(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.table_groups SET archived_at = now() WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Grup meja");
    await tx.execute(sql`UPDATE fnb.dining_tables SET group_id = NULL WHERE group_id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.table_group.archived", targetType: "table_group", targetId: id });
  });
}
