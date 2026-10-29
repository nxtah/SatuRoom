import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { SettingsInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { forbidden } from "./errors";

export interface Settings {
  businessName: string;
  taxPercent: number;
  servicePercent: number;
  receiptPrefix: string;
  receiptHeader: string | null;
  receiptFooter: string | null;
}

type Tx = Parameters<Parameters<typeof withContext>[2]>[0];

/** Dibaca di dalam transaksi pemanggil supaya pesanan memakai tarif yang sama sampai selesai. */
export async function readSettings(tx: Tx, businessId: string): Promise<Settings> {
  const [row] = (await tx.execute(sql`
    SELECT b.name AS "businessName", coalesce(s.tax_percent, 0)::float8 AS "taxPercent", coalesce(s.service_percent, 0)::float8 AS "servicePercent",
           coalesce(s.receipt_prefix, 'INV') AS "receiptPrefix", s.receipt_header AS "receiptHeader", s.receipt_footer AS "receiptFooter"
    FROM core.businesses b LEFT JOIN fnb.settings s ON s.business_id = b.id WHERE b.id = ${businessId}::uuid`)) as unknown as Settings[];
  return row!;
}

export const getSettings = (ctx: FnbContext) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, (tx) => readSettings(tx, ctx.businessId));

export async function updateSettings(ctx: FnbContext, input: z.infer<typeof SettingsInput>): Promise<void> {
  if (!can(ctx, "settings.manage")) throw forbidden();
  await withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    await tx.execute(sql`
      INSERT INTO fnb.settings (business_id, tax_percent, service_percent, receipt_prefix, receipt_header, receipt_footer)
      VALUES (${ctx.businessId}::uuid, ${input.taxPercent}, ${input.servicePercent}, ${input.receiptPrefix}, ${input.receiptHeader || null}, ${input.receiptFooter || null})
      ON CONFLICT (business_id) DO UPDATE SET tax_percent = EXCLUDED.tax_percent, service_percent = EXCLUDED.service_percent,
        receipt_prefix = EXCLUDED.receipt_prefix, receipt_header = EXCLUDED.receipt_header, receipt_footer = EXCLUDED.receipt_footer, updated_at = now()`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.settings.updated", targetType: "business", targetId: ctx.businessId, meta: { ...input } });
  });
}
