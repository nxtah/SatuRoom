import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { PrinterInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";

export type Printer = { id: string; name: string; purpose: "receipt" | "kitchen" | "bar"; paper: 58 | 80; location: string | null; copies: number; isDefault: boolean; isActive: boolean };

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "settings.manage")) throw forbidden(); };

export async function listPrinters(ctx: FnbContext): Promise<Printer[]> {
  need(ctx);
  return inBusiness(ctx, async (tx) => (await tx.execute(sql`
    SELECT id, name, purpose, paper::int AS paper, location, copies::int AS copies, is_default AS "isDefault", is_active AS "isActive"
    FROM fnb.printers WHERE archived_at IS NULL ORDER BY purpose, name`)) as unknown as Printer[]);
}

/** Satu printer bawaan per fungsi (struk, dapur, bar); menjadikan yang lain bawaan melepas yang lama. */
export async function savePrinter(ctx: FnbContext, input: z.infer<typeof PrinterInput>, id?: string) {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    const makeDefault = input.isDefault && input.isActive;
    if (makeDefault) await tx.execute(sql`UPDATE fnb.printers SET is_default = false WHERE purpose = ${input.purpose} AND archived_at IS NULL AND is_default ${id ? sql`AND id <> ${id}::uuid` : sql``}`);
    let out = id;
    if (id) {
      const rows = (await tx.execute(sql`
        UPDATE fnb.printers SET name = ${input.name}, purpose = ${input.purpose}, paper = ${input.paper}, location = ${input.location || null}, copies = ${input.copies}, is_default = ${makeDefault}, is_active = ${input.isActive}
        WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
      if (!rows.length) throw notFound("Printer");
    } else {
      const [dup] = (await tx.execute(sql`SELECT 1 AS x FROM fnb.printers WHERE archived_at IS NULL AND lower(name) = lower(${input.name})`)) as unknown as unknown[];
      if (dup) throw new AppError(409, "duplicate", "Nama printer sudah dipakai.");
      const [row] = (await tx.execute(sql`
        INSERT INTO fnb.printers (business_id, name, purpose, paper, location, copies, is_default, is_active)
        VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.purpose}, ${input.paper}, ${input.location || null}, ${input.copies}, ${makeDefault}, ${input.isActive}) RETURNING id`)) as unknown as { id: string }[];
      out = row!.id;
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: id ? "fnb.printer.updated" : "fnb.printer.created", targetType: "printer", targetId: out!, meta: { name: input.name, purpose: input.purpose } });
    return { id: out! };
  });
}

export async function archivePrinter(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE fnb.printers SET archived_at = now(), is_default = false WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Printer");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.printer.archived", targetType: "printer", targetId: id });
  });
}
