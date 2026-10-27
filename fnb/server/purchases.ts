import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { PurchaseInput, SupplierInput } from "@/lib/schemas";
import { db } from "./db";
import type { FnbContext } from "./context";

export type Supplier = { id: string; name: string; phone: string | null };
export type PurchaseRow = {
  id: string; supplierName: string | null; total: number; notes: string | null; createdAt: string;
  lines: { name: string; unit: string; quantity: number; unitCost: number }[];
};

const canManage = (ctx: FnbContext) => ctx.roles.some((r) => ["owner", "manager", "inventory"].includes(r));
const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) =>
  withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);

export function listSuppliers(ctx: FnbContext): Promise<Supplier[]> {
  return inBusiness(ctx, async (tx) =>
    (await tx.execute(sql`SELECT id, name, phone FROM fnb.suppliers WHERE archived_at IS NULL ORDER BY name`)) as unknown as Supplier[]);
}

export async function createSupplier(ctx: FnbContext, input: z.infer<typeof SupplierInput>) {
  if (!canManage(ctx)) throw new Error("FORBIDDEN");
  return inBusiness(ctx, async (tx) => {
    const dup = (await tx.execute(sql`SELECT 1 FROM fnb.suppliers WHERE archived_at IS NULL AND lower(name) = lower(${input.name})`)) as unknown as unknown[];
    if (dup.length) throw new Error("DUPLICATE");
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.suppliers (business_id, name, phone) VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.phone ?? null})
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.supplier.created", targetType: "supplier", targetId: row!.id,
    });
    return { id: row!.id };
  });
}

export function listPurchases(ctx: FnbContext, limit = 20): Promise<PurchaseRow[]> {
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT p.id, s.name AS "supplierName", p.total, p.notes,
             to_char(p.created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD"T"HH24:MI') AS "createdAt"
      FROM fnb.purchases p LEFT JOIN fnb.suppliers s ON s.id = p.supplier_id
      ORDER BY p.created_at DESC LIMIT ${limit}`)) as unknown as Omit<PurchaseRow, "lines">[];
    if (!rows.length) return [];
    const lines = (await tx.execute(sql`
      SELECT l.purchase_id AS "purchaseId", i.name, i.unit, l.quantity::float8 AS quantity, l.unit_cost AS "unitCost"
      FROM fnb.purchase_lines l JOIN fnb.ingredients i ON i.id = l.ingredient_id
      WHERE l.purchase_id IN (${sql.join(rows.map((r) => sql`${r.id}::uuid`), sql`, `)}) ORDER BY i.name`)) as unknown as
      (PurchaseRow["lines"][number] & { purchaseId: string })[];
    return rows.map((r) => ({ ...r, lines: lines.filter((l) => l.purchaseId === r.id).map(({ purchaseId, ...l }) => l) }));
  });
}

/**
 * Barang diterima: stok bertambah dan harga rata-rata bahan dihitung tertimbang
 * (stok lama x harga lama + jumlah baru x harga beli) / total. Satu transaksi.
 */
export async function recordPurchase(ctx: FnbContext, input: z.infer<typeof PurchaseInput>) {
  if (!canManage(ctx)) throw new Error("FORBIDDEN");
  const merged = new Map<string, { quantity: number; cost: number }>();
  for (const l of input.lines) {
    const cur = merged.get(l.ingredientId);
    // Bahan yang sama di dua baris digabung; harga satuannya dirata-rata tertimbang.
    merged.set(l.ingredientId, cur
      ? { quantity: cur.quantity + l.quantity, cost: (cur.cost * cur.quantity + l.unitCost * l.quantity) / (cur.quantity + l.quantity) }
      : { quantity: l.quantity, cost: l.unitCost });
  }
  return inBusiness(ctx, async (tx) => {
    if (input.supplierId) {
      const s = (await tx.execute(sql`SELECT 1 FROM fnb.suppliers WHERE id = ${input.supplierId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
      if (!s.length) throw new Error("NOT_FOUND");
    }
    const ids = [...merged.keys()].sort();
    const found = (await tx.execute(sql`
      SELECT id, stock::float8 AS stock, average_cost AS "averageCost" FROM fnb.ingredients
      WHERE archived_at IS NULL AND id IN (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)}) ORDER BY id FOR UPDATE`)) as unknown as
      { id: string; stock: number; averageCost: number }[];
    if (found.length !== ids.length) throw new Error("NOT_FOUND");
    const total = Math.round([...merged.values()].reduce((a, l) => a + l.quantity * l.cost, 0));
    const [purchase] = (await tx.execute(sql`
      INSERT INTO fnb.purchases (business_id, supplier_id, total, notes, recorded_by)
      VALUES (${ctx.businessId}::uuid, ${input.supplierId ?? null}::uuid, ${total}, ${input.notes ?? null}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    for (const ing of found) {
      const line = merged.get(ing.id)!;
      const quantity = Math.round(line.quantity * 1000) / 1000;
      const unitCost = Math.round(line.cost);
      const newStock = ing.stock + quantity;
      // Stok minus (data lama) tidak boleh menarik harga rata-rata turun di bawah harga beli.
      const base = Math.max(ing.stock, 0);
      const avg = Math.round((base * ing.averageCost + quantity * unitCost) / (base + quantity));
      await tx.execute(sql`
        INSERT INTO fnb.purchase_lines (business_id, purchase_id, ingredient_id, quantity, unit_cost)
        VALUES (${ctx.businessId}::uuid, ${purchase!.id}::uuid, ${ing.id}::uuid, ${quantity}, ${unitCost})`);
      await tx.execute(sql`UPDATE fnb.ingredients SET stock = ${newStock}, average_cost = ${avg} WHERE id = ${ing.id}::uuid`);
      await tx.execute(sql`
        INSERT INTO fnb.stock_movements (business_id, ingredient_id, quantity, reason, reference_type, reference_id, recorded_by)
        VALUES (${ctx.businessId}::uuid, ${ing.id}::uuid, ${quantity}, 'Pembelian', 'purchase', ${purchase!.id}::uuid, ${ctx.userId}::uuid)`);
    }
    await tx.insert(auditEvents).values({
      businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.purchase.recorded", targetType: "purchase",
      targetId: purchase!.id, meta: { total, lines: ids.length },
    });
    return { id: purchase!.id, total };
  });
}
