import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, forbidden, notFound } from "./errors";
import { accountIdOf, postJournal } from "./ledger";
import { academyToday } from "./schedule";

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal.");
const rp = z.coerce.number().int().min(0).max(1_000_000_000);

export const ItemInput = z.object({
  name: z.string().trim().min(2, "Isi nama barang.").max(80),
  unit: z.string().trim().min(1).max(20).default("pcs"),
  minQty: z.coerce.number().int().min(0).default(0),
  forSale: z.boolean().default(false),
  salePrice: z.preprocess(empty, rp.nullable()).optional(),
  description: z.preprocess(empty, z.string().trim().max(300).nullable()).optional(),
});
export const SupplierInput = z.object({
  name: z.string().trim().min(2, "Isi nama supplier.").max(80),
  phone: z.preprocess(empty, z.string().trim().max(30).nullable()).optional(),
  note: z.preprocess(empty, z.string().trim().max(200).nullable()).optional(),
});
export const PurchaseInput = z.object({
  supplierId: z.string().uuid({ message: "Pilih supplier." }),
  orderedOn: ymd,
  note: z.preprocess(empty, z.string().trim().max(200).nullable()).optional(),
  lines: z.array(z.object({ itemId: z.string().uuid(), qty: z.coerce.number().int().min(1), unitCost: rp })).min(1, "Tambahkan minimal satu barang.").max(50),
});
export const IssueInput = z.object({ itemId: z.string().uuid(), qty: z.coerce.number().int().min(1), note: z.string().trim().min(2, "Tulis dipakai untuk apa.").max(200) });
export const CountInput = z.object({ counts: z.array(z.object({ itemId: z.string().uuid(), qty: z.coerce.number().int().min(0) })).min(1).max(500) });
export const AssetInput = z.object({
  name: z.string().trim().min(2, "Isi nama aset.").max(80),
  acquiredOn: ymd,
  cost: z.coerce.number().int().min(1, "Isi harga beli."),
  salvage: z.coerce.number().int().min(0).default(0),
  usefulMonths: z.coerce.number().int().min(1, "Isi umur pakai.").max(600),
  paidFrom: z.preprocess(empty, z.string().uuid().nullable()).optional(),
});
export const OrderLineInput = z.object({ itemId: z.string().uuid(), qty: z.coerce.number().int().min(1).max(100) });
export const OrderInput = z.object({
  playerId: z.preprocess(empty, z.string().uuid().nullable()).optional(),
  buyerName: z.string().trim().min(2, "Isi nama pembeli.").max(100),
  note: z.preprocess(empty, z.string().trim().max(200).nullable()).optional(),
  lines: z.array(OrderLineInput).min(1, "Pilih minimal satu barang.").max(20),
});

const who = (ctx: AcademyContext) => ({ businessId: ctx.businessId, userId: ctx.userId });

function gate(ctx: AcademyContext, kind: "inventory" | "store" = "inventory") {
  requireModule(ctx, kind);
  requirePermission(ctx, kind === "inventory" ? "inventory.manage" : "store.manage");
  if (ctx.branchIds !== null) throw forbidden();
}

function audit(ctx: AcademyContext, tx: Tx, action: string, targetType: string, targetId: string, meta: Record<string, unknown> = {}) {
  return tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action, targetType, targetId, meta });
}

// ---------- Barang ----------

export interface ItemRow {
  id: string;
  name: string;
  unit: string;
  qty: number;
  avgCost: number;
  value: number;
  minQty: number;
  forSale: boolean;
  salePrice: number | null;
  description: string | null;
  low: boolean;
}

export async function listItems(ctx: AcademyContext): Promise<ItemRow[]> {
  if (!ctx.can("inventory.manage") && !ctx.can("store.manage")) throw forbidden();
  requireModule(ctx, "inventory");
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT id, name, unit, qty, avg_cost AS "avgCost", qty * avg_cost AS value, min_qty AS "minQty", for_sale AS "forSale",
             sale_price AS "salePrice", description, (qty <= min_qty AND min_qty > 0) AS low
      FROM bola.items WHERE archived_at IS NULL ORDER BY lower(name)`)) as unknown as ItemRow[],
  );
}

const dupItem = (e: unknown) => {
  if ((e as { cause?: { code?: string } })?.cause?.code === "23505") throw new AppError(409, "duplicate", "Nama barang sudah ada.", { name: "Nama barang sudah ada." });
  throw e;
};

export async function saveItem(ctx: AcademyContext, id: string | null, input: z.infer<typeof ItemInput>): Promise<string> {
  if (!ctx.can("inventory.manage") && !ctx.can("store.manage")) throw forbidden();
  requireModule(ctx, "inventory");
  if (input.forSale && (input.salePrice === null || input.salePrice === undefined)) {
    throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { salePrice: "Isi harga jual." });
  }
  return inAcademy(ctx, async (tx) => {
    if (id) {
      const rows = (await tx
        .execute(sql`
          UPDATE bola.items SET name = ${input.name}, unit = ${input.unit}, min_qty = ${input.minQty}, for_sale = ${input.forSale},
            sale_price = ${input.salePrice ?? null}, description = ${input.description ?? null}
          WHERE id = ${id}::uuid AND archived_at IS NULL RETURNING id`)
        .catch(dupItem)) as unknown as unknown[];
      if (!rows.length) throw notFound("Barang");
      await audit(ctx, tx, "item.updated", "item", id);
      return id;
    }
    const [row] = (await tx
      .execute(sql`
        INSERT INTO bola.items (business_id, name, unit, min_qty, for_sale, sale_price, description)
        VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.unit}, ${input.minQty}, ${input.forSale}, ${input.salePrice ?? null}, ${input.description ?? null})
        RETURNING id`)
      .catch(dupItem)) as unknown as { id: string }[];
    await audit(ctx, tx, "item.created", "item", row!.id, { name: input.name });
    return row!.id;
  });
}

export async function archiveItem(ctx: AcademyContext, id: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [i] = (await tx.execute(sql`SELECT qty FROM bola.items WHERE id = ${id}::uuid AND archived_at IS NULL`)) as unknown as { qty: number }[];
    if (!i) throw notFound("Barang");
    if (i.qty > 0) throw new AppError(409, "has_stock", "Stok barang ini masih ada. Habiskan atau sesuaikan lewat stok opname dulu.");
    await tx.execute(sql`UPDATE bola.items SET archived_at = now() WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "item.archived", "item", id);
  });
}

/** Kartu stok satu barang. */
export async function stockCard(ctx: AcademyContext, itemId: string) {
  gate(ctx);
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT to_char(moved_on, 'YYYY-MM-DD') AS date, kind, qty, unit_cost AS "unitCost", note
      FROM bola.stock_moves WHERE item_id = ${itemId}::uuid ORDER BY created_at DESC LIMIT 100`)) as unknown as {
      date: string; kind: string; qty: number; unitCost: number; note: string | null;
    }[],
  );
}

/** Mengurangi stok dengan harga pokok rata-rata. Mengembalikan total nilai yang keluar. */
async function takeStock(ctx: AcademyContext, tx: Tx, itemId: string, qty: number, kind: "sale" | "issue" | "count", date: string, refId: string | null, note: string | null): Promise<{ cost: number; unitCost: number; name: string }> {
  const [i] = (await tx.execute(sql`SELECT name, qty, avg_cost AS "avgCost" FROM bola.items WHERE id = ${itemId}::uuid AND archived_at IS NULL FOR UPDATE`)) as unknown as { name: string; qty: number; avgCost: number }[];
  if (!i) throw notFound("Barang");
  if (i.qty < qty) throw new AppError(409, "no_stock", `Stok ${i.name} tinggal ${i.qty}.`);
  await tx.execute(sql`UPDATE bola.items SET qty = qty - ${qty} WHERE id = ${itemId}::uuid`);
  await tx.execute(sql`
    INSERT INTO bola.stock_moves (business_id, item_id, moved_on, kind, qty, unit_cost, ref_id, note, created_by)
    VALUES (${ctx.businessId}::uuid, ${itemId}::uuid, ${date}::date, ${kind}, ${-qty}, ${i.avgCost}, ${refId}::uuid, ${note}, ${ctx.userId}::uuid)`);
  return { cost: i.avgCost * qty, unitCost: i.avgCost, name: i.name };
}

/** Menambah stok dan memperbarui harga pokok rata-rata tertimbang. */
async function addStock(ctx: AcademyContext, tx: Tx, itemId: string, qty: number, unitCost: number, kind: "purchase" | "count" | "return", date: string, refId: string | null, note: string | null) {
  await tx.execute(sql`
    UPDATE bola.items SET avg_cost = CASE WHEN qty + ${qty} = 0 THEN avg_cost ELSE round((qty * avg_cost + ${qty * unitCost})::numeric / (qty + ${qty}))::int END,
      qty = qty + ${qty}
    WHERE id = ${itemId}::uuid`);
  await tx.execute(sql`
    INSERT INTO bola.stock_moves (business_id, item_id, moved_on, kind, qty, unit_cost, ref_id, note, created_by)
    VALUES (${ctx.businessId}::uuid, ${itemId}::uuid, ${date}::date, ${kind}, ${qty}, ${unitCost}, ${refId}::uuid, ${note}, ${ctx.userId}::uuid)`);
}

/** Barang dipakai sendiri (mis. bola latihan): Perlengkapan latihan / Persediaan. */
export async function issueStock(ctx: AcademyContext, input: z.infer<typeof IssueInput>): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    const { cost, name } = await takeStock(ctx, tx, input.itemId, input.qty, "issue", today, null, input.note);
    await postJournal(tx, who(ctx), {
      date: today,
      memo: `Pemakaian ${input.qty} ${name}: ${input.note}`,
      source: "stock",
      sourceId: input.itemId,
      lines: [
        { account: { key: "equipment" }, debit: cost },
        { account: { key: "inventory" }, credit: cost },
      ],
    });
    await audit(ctx, tx, "stock.issued", "item", input.itemId, { qty: input.qty });
  });
}

/** Stok opname: jumlah fisik dibandingkan catatan; selisihnya dijurnal ke Selisih stok. */
export async function stockCount(ctx: AcademyContext, input: z.infer<typeof CountInput>): Promise<{ adjusted: number; value: number }> {
  gate(ctx);
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    let value = 0;
    let adjusted = 0;
    for (const c of input.counts) {
      const [i] = (await tx.execute(sql`SELECT qty, avg_cost AS "avgCost" FROM bola.items WHERE id = ${c.itemId}::uuid AND archived_at IS NULL`)) as unknown as { qty: number; avgCost: number }[];
      if (!i || i.qty === c.qty) continue;
      adjusted++;
      if (c.qty < i.qty) value -= (await takeStock(ctx, tx, c.itemId, i.qty - c.qty, "count", today, null, "Stok opname")).cost;
      else {
        await addStock(ctx, tx, c.itemId, c.qty - i.qty, i.avgCost, "count", today, null, "Stok opname");
        value += (c.qty - i.qty) * i.avgCost;
      }
    }
    if (value !== 0) {
      await postJournal(tx, who(ctx), {
        date: today,
        memo: "Penyesuaian stok opname",
        source: "stock",
        lines:
          value < 0
            ? [{ account: { key: "stock_adjustment" }, debit: -value }, { account: { key: "inventory" }, credit: -value }]
            : [{ account: { key: "inventory" }, debit: value }, { account: { key: "stock_adjustment" }, credit: value }],
      });
    }
    await audit(ctx, tx, "stock.counted", "stock", ctx.businessId, { adjusted, value });
    return { adjusted, value };
  });
}

// ---------- Supplier dan pembelian ----------

export async function listSuppliers(ctx: AcademyContext) {
  gate(ctx);
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT s.id, s.name, s.phone, s.note,
        coalesce((SELECT sum(total) FROM bola.purchase_orders p WHERE p.supplier_id = s.id AND p.status = 'received' AND p.paid_on IS NULL), 0)::int AS owed
      FROM bola.suppliers s WHERE s.archived_at IS NULL ORDER BY lower(s.name)`)) as unknown as { id: string; name: string; phone: string | null; note: string | null; owed: number }[],
  );
}

export async function createSupplier(ctx: AcademyContext, input: z.infer<typeof SupplierInput>): Promise<string> {
  gate(ctx);
  return inAcademy(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.suppliers (business_id, name, phone, note) VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.phone ?? null}, ${input.note ?? null})
      RETURNING id`)) as unknown as { id: string }[];
    await audit(ctx, tx, "supplier.created", "supplier", row!.id);
    return row!.id;
  });
}

export interface PurchaseRow {
  id: string;
  supplierName: string;
  orderedOn: string;
  status: "ordered" | "received" | "cancelled";
  total: number;
  receivedOn: string | null;
  paidOn: string | null;
  note: string | null;
  lines: { itemName: string; qty: number; unitCost: number }[];
}

export async function listPurchases(ctx: AcademyContext): Promise<PurchaseRow[]> {
  gate(ctx);
  return inAcademy(ctx, async (tx) => {
    const pos = (await tx.execute(sql`
      SELECT p.id, s.name AS "supplierName", to_char(p.ordered_on, 'YYYY-MM-DD') AS "orderedOn", p.status, p.total, p.note,
             to_char(p.received_on, 'YYYY-MM-DD') AS "receivedOn", to_char(p.paid_on, 'YYYY-MM-DD') AS "paidOn"
      FROM bola.purchase_orders p JOIN bola.suppliers s ON s.id = p.supplier_id
      ORDER BY p.created_at DESC LIMIT 100`)) as unknown as Omit<PurchaseRow, "lines">[];
    if (!pos.length) return [];
    const lines = (await tx.execute(sql`
      SELECT l.po_id AS "poId", i.name AS "itemName", l.qty, l.unit_cost AS "unitCost"
      FROM bola.purchase_lines l JOIN bola.items i ON i.id = l.item_id
      WHERE l.po_id = ANY (${`{${pos.map((p) => p.id).join(",")}}`}::uuid[])`)) as unknown as (PurchaseRow["lines"][number] & { poId: string })[];
    return pos.map((p) => ({ ...p, lines: lines.filter((l) => l.poId === p.id).map(({ poId: _p, ...l }) => l) }));
  });
}

export async function createPurchase(ctx: AcademyContext, input: z.infer<typeof PurchaseInput>): Promise<string> {
  gate(ctx);
  return inAcademy(ctx, async (tx) => {
    const [s] = (await tx.execute(sql`SELECT 1 AS x FROM bola.suppliers WHERE id = ${input.supplierId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
    if (!s) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { supplierId: "Supplier tidak ditemukan." });
    const total = input.lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
    const [po] = (await tx.execute(sql`
      INSERT INTO bola.purchase_orders (business_id, supplier_id, ordered_on, note, total, created_by)
      VALUES (${ctx.businessId}::uuid, ${input.supplierId}::uuid, ${input.orderedOn}::date, ${input.note ?? null}, ${total}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    for (const l of input.lines) {
      const [i] = (await tx.execute(sql`SELECT 1 AS x FROM bola.items WHERE id = ${l.itemId}::uuid AND archived_at IS NULL`)) as unknown as unknown[];
      if (!i) throw new AppError(422, "invalid", "Ada barang yang tidak ditemukan.");
      await tx.execute(sql`
        INSERT INTO bola.purchase_lines (business_id, po_id, item_id, qty, unit_cost)
        VALUES (${ctx.businessId}::uuid, ${po!.id}::uuid, ${l.itemId}::uuid, ${l.qty}, ${l.unitCost})`);
    }
    await audit(ctx, tx, "purchase.created", "purchase", po!.id, { total });
    return po!.id;
  });
}

/** Barang diterima: stok bertambah, Persediaan / Utang usaha. */
export async function receivePurchase(ctx: AcademyContext, id: string, receivedOn: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [po] = (await tx.execute(sql`
      SELECT p.status, p.total, s.name FROM bola.purchase_orders p JOIN bola.suppliers s ON s.id = p.supplier_id
      WHERE p.id = ${id}::uuid FOR UPDATE OF p`)) as unknown as { status: string; total: number; name: string }[];
    if (!po) throw notFound("Pembelian");
    if (po.status !== "ordered") throw new AppError(409, "not_open", "Pembelian ini sudah diterima atau dibatalkan.");
    if (receivedOn > (await academyToday(tx))) throw new AppError(422, "invalid", "Tanggal terima tidak boleh di masa depan.");
    const lines = (await tx.execute(sql`SELECT item_id AS "itemId", qty, unit_cost AS "unitCost" FROM bola.purchase_lines WHERE po_id = ${id}::uuid`)) as unknown as { itemId: string; qty: number; unitCost: number }[];
    for (const l of lines) await addStock(ctx, tx, l.itemId, l.qty, l.unitCost, "purchase", receivedOn, id, `Pembelian dari ${po.name}`);
    await postJournal(tx, who(ctx), {
      date: receivedOn,
      memo: `Terima barang dari ${po.name}`,
      source: "purchase",
      sourceId: id,
      lines: [
        { account: { key: "inventory" }, debit: po.total },
        { account: { key: "payable" }, credit: po.total },
      ],
    });
    await tx.execute(sql`UPDATE bola.purchase_orders SET status = 'received', received_on = ${receivedOn}::date WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "purchase.received", "purchase", id);
  });
}

/** Membayar supplier: Utang usaha / Kas atau Bank. */
export async function payPurchase(ctx: AcademyContext, id: string, paidOn: string, accountId?: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [po] = (await tx.execute(sql`
      SELECT p.status, p.total, p.paid_on AS "paidOn", s.name FROM bola.purchase_orders p JOIN bola.suppliers s ON s.id = p.supplier_id
      WHERE p.id = ${id}::uuid FOR UPDATE OF p`)) as unknown as { status: string; total: number; paidOn: string | null; name: string }[];
    if (!po) throw notFound("Pembelian");
    if (po.status !== "received") throw new AppError(409, "not_received", "Terima barangnya dulu sebelum mencatat pembayaran.");
    if (po.paidOn) throw new AppError(409, "paid", "Pembelian ini sudah dibayar.");
    const from = accountId ?? (await accountIdOf(tx, "cash"));
    await postJournal(tx, who(ctx), {
      date: paidOn,
      memo: `Bayar supplier ${po.name}`,
      source: "purchase_pay",
      sourceId: id,
      lines: [
        { account: { key: "payable" }, debit: po.total },
        { account: from, credit: po.total },
      ],
    });
    await tx.execute(sql`UPDATE bola.purchase_orders SET paid_on = ${paidOn}::date, paid_from = ${from}::uuid WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "purchase.paid", "purchase", id);
  });
}

export async function cancelPurchase(ctx: AcademyContext, id: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE bola.purchase_orders SET status = 'cancelled' WHERE id = ${id}::uuid AND status = 'ordered' RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw new AppError(409, "not_open", "Hanya pesanan yang belum diterima yang bisa dibatalkan.");
    await audit(ctx, tx, "purchase.cancelled", "purchase", id);
  });
}

// ---------- Aset tetap ----------

export interface AssetRow {
  id: string;
  name: string;
  acquiredOn: string;
  cost: number;
  salvage: number;
  usefulMonths: number;
  depreciated: number;
  bookValue: number;
  disposed: boolean;
}

export async function listAssets(ctx: AcademyContext): Promise<{ assets: AssetRow[]; lastRun: string | null }> {
  gate(ctx);
  return inAcademy(ctx, async (tx) => {
    const assets = (await tx.execute(sql`
      SELECT a.id, a.name, to_char(a.acquired_on, 'YYYY-MM-DD') AS "acquiredOn", a.cost, a.salvage, a.useful_months AS "usefulMonths",
        coalesce((SELECT sum(amount) FROM bola.depreciation_lines d WHERE d.asset_id = a.id), 0)::int AS depreciated,
        a.disposed_on IS NOT NULL AS disposed
      FROM bola.fixed_assets a ORDER BY a.acquired_on DESC`)) as unknown as Omit<AssetRow, "bookValue">[];
    const [r] = (await tx.execute(sql`SELECT to_char(max(month), 'YYYY-MM') AS m FROM bola.depreciation_runs`)) as unknown as { m: string | null }[];
    return { assets: assets.map((a) => ({ ...a, bookValue: a.cost - a.depreciated })), lastRun: r?.m ?? null };
  });
}

/** Mencatat aset: Aset tetap / Kas (atau Utang usaha bila belum dibayar). */
export async function createAsset(ctx: AcademyContext, input: z.infer<typeof AssetInput>): Promise<string> {
  gate(ctx);
  if (input.salvage >= input.cost) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { salvage: "Nilai sisa harus lebih kecil dari harga beli." });
  return inAcademy(ctx, async (tx) => {
    if (input.acquiredOn > (await academyToday(tx))) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { acquiredOn: "Tanggal tidak boleh di masa depan." });
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.fixed_assets (business_id, name, acquired_on, cost, salvage, useful_months, paid_from, created_by)
      VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.acquiredOn}::date, ${input.cost}, ${input.salvage}, ${input.usefulMonths},
              ${input.paidFrom ?? null}::uuid, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await postJournal(tx, who(ctx), {
      date: input.acquiredOn,
      memo: `Beli aset: ${input.name}`,
      source: "asset",
      sourceId: row!.id,
      lines: [
        { account: { key: "fixed_assets" }, debit: input.cost },
        input.paidFrom ? { account: input.paidFrom, credit: input.cost } : { account: { key: "payable" }, credit: input.cost },
      ],
    });
    await audit(ctx, tx, "asset.created", "asset", row!.id, { cost: input.cost });
    return row!.id;
  });
}

/** Penyusutan garis lurus satu bulan untuk semua aset aktif. Sekali per bulan. */
export async function runDepreciation(ctx: AcademyContext, month: string): Promise<number> {
  gate(ctx);
  if (!/^\d{4}-\d{2}$/.test(month)) throw new AppError(422, "invalid", "Bulan tidak valid.");
  return inAcademy(ctx, async (tx) => {
    const today = await academyToday(tx);
    if (month > today.slice(0, 7)) throw new AppError(422, "invalid", "Penyusutan hanya untuk bulan berjalan atau yang sudah lewat.");
    const [done] = (await tx.execute(sql`SELECT 1 AS x FROM bola.depreciation_runs WHERE month = ${`${month}-01`}::date`)) as unknown as unknown[];
    if (done) throw new AppError(409, "done", "Penyusutan bulan ini sudah dicatat.");
    const assets = (await tx.execute(sql`
      SELECT a.id, a.cost, a.salvage, a.useful_months AS months,
        coalesce((SELECT sum(amount) FROM bola.depreciation_lines d WHERE d.asset_id = a.id), 0)::int AS done
      FROM bola.fixed_assets a
      WHERE a.disposed_on IS NULL AND date_trunc('month', a.acquired_on) <= ${`${month}-01`}::date`)) as unknown as { id: string; cost: number; salvage: number; months: number; done: number }[];
    let total = 0;
    for (const a of assets) {
      const left = a.cost - a.salvage - a.done;
      const amount = Math.min(left, Math.round((a.cost - a.salvage) / a.months));
      if (amount <= 0) continue;
      total += amount;
      await tx.execute(sql`
        INSERT INTO bola.depreciation_lines (business_id, month, asset_id, amount) VALUES (${ctx.businessId}::uuid, ${`${month}-01`}::date, ${a.id}::uuid, ${amount})`);
    }
    await tx.execute(sql`INSERT INTO bola.depreciation_runs (business_id, month, total, run_by) VALUES (${ctx.businessId}::uuid, ${`${month}-01`}::date, ${total}, ${ctx.userId}::uuid)`);
    const end = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);
    await postJournal(tx, who(ctx), {
      date: end < today ? end : today,
      memo: `Penyusutan aset ${month.slice(5)}/${month.slice(0, 4)}`,
      source: "depreciation",
      lines: [
        { account: { key: "depreciation" }, debit: total },
        { account: { key: "accum_depreciation" }, credit: total },
      ],
    });
    await audit(ctx, tx, "depreciation.run", "period", month, { total });
    return total;
  });
}

// ---------- Toko ----------

export interface OrderRow {
  id: string;
  buyerName: string;
  playerId: string | null;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  total: number;
  channel: "staff" | "parent";
  note: string | null;
  createdAt: string;
  paidOn: string | null;
  lines: { itemName: string; qty: number; price: number }[];
}

async function ordersWhere(tx: Tx, where: ReturnType<typeof sql>): Promise<OrderRow[]> {
  const orders = (await tx.execute(sql`
    SELECT o.id, o.buyer_name AS "buyerName", o.player_id AS "playerId", o.status, o.total, o.channel, o.note,
           to_char(o.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "createdAt", to_char(o.paid_on, 'YYYY-MM-DD') AS "paidOn"
    FROM bola.orders o WHERE ${where} ORDER BY o.created_at DESC LIMIT 100`)) as unknown as Omit<OrderRow, "lines">[];
  if (!orders.length) return [];
  const lines = (await tx.execute(sql`
    SELECT order_id AS "orderId", item_name AS "itemName", qty, price FROM bola.order_lines
    WHERE order_id = ANY (${`{${orders.map((o) => o.id).join(",")}}`}::uuid[])`)) as unknown as (OrderRow["lines"][number] & { orderId: string })[];
  return orders.map((o) => ({ ...o, lines: lines.filter((l) => l.orderId === o.id).map(({ orderId: _o, ...l }) => l) }));
}

export async function listOrders(ctx: AcademyContext): Promise<OrderRow[]> {
  gate(ctx, "store");
  return inAcademy(ctx, (tx) => ordersWhere(tx, sql`true`));
}

/** Katalog toko: barang dijual dan stok tersedia. */
export async function catalog(tx: Tx) {
  return (await tx.execute(sql`
    SELECT id, name, unit, sale_price AS price, qty, description FROM bola.items
    WHERE for_sale AND archived_at IS NULL ORDER BY lower(name)`)) as unknown as { id: string; name: string; unit: string; price: number; qty: number; description: string | null }[];
}

export async function storeCatalog(ctx: AcademyContext) {
  gate(ctx, "store");
  return inAcademy(ctx, (tx) => catalog(tx));
}

/** Membuat pesanan (dari staf atau orang tua). Stok belum berkurang sampai dibayar. */
export async function placeOrderIn(tx: Tx, businessId: string, userId: string, input: z.infer<typeof OrderInput>, channel: "staff" | "parent"): Promise<string> {
  const items = await catalog(tx);
  let total = 0;
  const lines = input.lines.map((l) => {
    const it = items.find((x) => x.id === l.itemId);
    if (!it) throw new AppError(422, "invalid", "Ada barang yang tidak dijual lagi. Muat ulang halaman.");
    if (it.qty < l.qty) throw new AppError(409, "no_stock", `Stok ${it.name} tinggal ${it.qty}.`);
    total += it.price * l.qty;
    return { ...l, name: it.name, price: it.price };
  });
  const [o] = (await tx.execute(sql`
    INSERT INTO bola.orders (business_id, player_id, buyer_name, total, note, channel, placed_by)
    VALUES (${businessId}::uuid, ${input.playerId ?? null}::uuid, ${input.buyerName}, ${total}, ${input.note ?? null}, ${channel}, ${userId}::uuid)
    RETURNING id`)) as unknown as { id: string }[];
  for (const l of lines) {
    await tx.execute(sql`
      INSERT INTO bola.order_lines (business_id, order_id, item_id, item_name, qty, price)
      VALUES (${businessId}::uuid, ${o!.id}::uuid, ${l.itemId}::uuid, ${l.name}, ${l.qty}, ${l.price})`);
  }
  await tx.insert(auditEvents).values({ businessId, actorUserId: userId, action: `order.placed_${channel}`, targetType: "order", targetId: o!.id, meta: { total } });
  return o!.id;
}

export async function placeOrder(ctx: AcademyContext, input: z.infer<typeof OrderInput>): Promise<string> {
  gate(ctx, "store");
  return inAcademy(ctx, (tx) => placeOrderIn(tx, ctx.businessId, ctx.userId, input, "staff"));
}

/** Pesanan dibayar: stok keluar, Kas / Penjualan dan HPP / Persediaan. */
export async function payOrder(ctx: AcademyContext, id: string, method: "cash" | "transfer" | "other", paidOn: string): Promise<void> {
  gate(ctx, "store");
  await inAcademy(ctx, async (tx) => {
    const [o] = (await tx.execute(sql`SELECT status, total, buyer_name AS name FROM bola.orders WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { status: string; total: number; name: string }[];
    if (!o) throw notFound("Pesanan");
    if (o.status !== "pending") throw new AppError(409, "not_pending", "Pesanan ini sudah dibayar atau dibatalkan.");
    if (paidOn > (await academyToday(tx))) throw new AppError(422, "invalid", "Tanggal bayar tidak boleh di masa depan.");
    const lines = (await tx.execute(sql`SELECT id, item_id AS "itemId", qty FROM bola.order_lines WHERE order_id = ${id}::uuid`)) as unknown as { id: string; itemId: string; qty: number }[];
    let cogs = 0;
    for (const l of lines) {
      const t = await takeStock(ctx, tx, l.itemId, l.qty, "sale", paidOn, id, `Jual ke ${o.name}`);
      cogs += t.cost;
      await tx.execute(sql`UPDATE bola.order_lines SET unit_cost = ${t.unitCost} WHERE id = ${l.id}::uuid`);
    }
    const account = await accountIdOf(tx, method === "transfer" ? "bank" : "cash");
    await postJournal(tx, who(ctx), {
      date: paidOn,
      memo: `Penjualan toko - ${o.name}`,
      source: "sale",
      sourceId: id,
      lines: [
        { account, debit: o.total },
        { account: { key: "sales" }, credit: o.total },
        { account: { key: "cogs" }, debit: cogs },
        { account: { key: "inventory" }, credit: cogs },
      ],
    });
    await tx.execute(sql`
      UPDATE bola.orders SET status = 'paid', paid_on = ${paidOn}::date, method = ${method}::bola.payment_method, account_id = ${account}::uuid
      WHERE id = ${id}::uuid`);
    await audit(ctx, tx, "order.paid", "order", id, { total: o.total });
  });
}

export async function setOrderStatus(ctx: AcademyContext, id: string, status: "fulfilled" | "cancelled"): Promise<void> {
  gate(ctx, "store");
  await inAcademy(ctx, async (tx) => {
    const [o] = (await tx.execute(sql`SELECT status FROM bola.orders WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { status: string }[];
    if (!o) throw notFound("Pesanan");
    if (status === "fulfilled" && o.status !== "paid") throw new AppError(409, "not_paid", "Catat pembayarannya dulu.");
    if (status === "cancelled" && o.status !== "pending") throw new AppError(409, "paid", "Pesanan yang sudah dibayar tidak bisa dibatalkan di sini.");
    await tx.execute(sql`UPDATE bola.orders SET status = ${status}::bola.order_status WHERE id = ${id}::uuid`);
    await audit(ctx, tx, `order.${status}`, "order", id);
  });
}

export { ordersWhere };
