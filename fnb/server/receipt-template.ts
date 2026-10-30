import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { ReceiptTemplateInput } from "@/lib/schemas";
import { cleanImageUrl } from "./cloudinary";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { forbidden } from "./errors";

export type ReceiptTemplate = { logoUrl: string | null; paper: 58 | 80; header: string | null; footer: string | null; showCashier: boolean; showTable: boolean; showCustomer: boolean; showTaxDetail: boolean; showPayment: boolean };
type Tx = Parameters<Parameters<typeof withContext>[2]>[0];

export const DEFAULT_TEMPLATE: ReceiptTemplate = { logoUrl: null, paper: 80, header: null, footer: null, showCashier: true, showTable: true, showCustomer: true, showTaxDetail: true, showPayment: true };

export async function readTemplate(tx: Tx, businessId: string): Promise<ReceiptTemplate> {
  const [row] = (await tx.execute(sql`
    SELECT receipt_logo_url AS "logoUrl", coalesce(receipt_paper, 80)::int AS paper, receipt_header AS header, receipt_footer AS footer,
           coalesce(receipt_show_cashier, true) AS "showCashier", coalesce(receipt_show_table, true) AS "showTable", coalesce(receipt_show_customer, true) AS "showCustomer",
           coalesce(receipt_show_tax_detail, true) AS "showTaxDetail", coalesce(receipt_show_payment, true) AS "showPayment"
    FROM fnb.settings WHERE business_id = ${businessId}::uuid`)) as unknown as ReceiptTemplate[];
  return row ?? DEFAULT_TEMPLATE;
}

export const getTemplate = (ctx: FnbContext) => {
  if (!can(ctx, "settings.manage")) throw forbidden();
  return withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, (tx) => readTemplate(tx, ctx.businessId));
};

export async function saveTemplate(ctx: FnbContext, input: z.infer<typeof ReceiptTemplateInput>) {
  if (!can(ctx, "settings.manage")) throw forbidden();
  const logo = cleanImageUrl(ctx, input.logoUrl);
  await withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, async (tx) => {
    await tx.execute(sql`
      INSERT INTO fnb.settings (business_id, receipt_logo_url, receipt_paper, receipt_header, receipt_footer, receipt_show_cashier, receipt_show_table, receipt_show_customer, receipt_show_tax_detail, receipt_show_payment)
      VALUES (${ctx.businessId}::uuid, ${logo}, ${input.paper}, ${input.header || null}, ${input.footer || null}, ${input.showCashier}, ${input.showTable}, ${input.showCustomer}, ${input.showTaxDetail}, ${input.showPayment})
      ON CONFLICT (business_id) DO UPDATE SET receipt_logo_url = EXCLUDED.receipt_logo_url, receipt_paper = EXCLUDED.receipt_paper, receipt_header = EXCLUDED.receipt_header, receipt_footer = EXCLUDED.receipt_footer,
        receipt_show_cashier = EXCLUDED.receipt_show_cashier, receipt_show_table = EXCLUDED.receipt_show_table, receipt_show_customer = EXCLUDED.receipt_show_customer,
        receipt_show_tax_detail = EXCLUDED.receipt_show_tax_detail, receipt_show_payment = EXCLUDED.receipt_show_payment, updated_at = now()`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.receipt_template.updated", targetType: "business", targetId: ctx.businessId, meta: { paper: input.paper } });
  });
}
