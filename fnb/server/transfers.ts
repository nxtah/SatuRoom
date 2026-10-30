import "server-only";
import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import type { TransferInput, TransferReceiveInput } from "@/lib/schemas";
import { can, type FnbContext } from "./context";
import { db } from "./db";
import { AppError, forbidden, notFound } from "./errors";
import { changeItemStock } from "./item-stock";

export type Transfer = {
  id: string; number: string; status: "draft" | "dikirim" | "diterima" | "dibatalkan"; note: string | null; fromName: string; toName: string; fromOutletId: string; toOutletId: string;
  createdAt: string; sentAt: string | null; receivedAt: string | null;
  lines: { menuItemId: string; name: string; sku: string | null; quantity: number; receivedQuantity: number | null }[];
};

const inBusiness = <T>(ctx: FnbContext, work: Parameters<typeof withContext<T>>[2]) => withContext(db(), { userId: ctx.userId, businessId: ctx.businessId }, work);
const need = (ctx: FnbContext) => { if (!can(ctx, "branches.manage") && !can(ctx, "stock.manage")) throw forbidden(); };

export async function listTransfers(ctx: FnbContext): Promise<Transfer[]> {
  need(ctx);
  return inBusiness(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      SELECT t.id, t.number, t.status, t.note, f.name AS "fromName", o.name AS "toName", t.from_outlet_id AS "fromOutletId", t.to_outlet_id AS "toOutletId",
             t.created_at AS "createdAt", t.sent_at AS "sentAt", t.received_at AS "receivedAt"
      FROM fnb.stock_transfers t JOIN fnb.outlets f ON f.id = t.from_outlet_id JOIN fnb.outlets o ON o.id = t.to_outlet_id ORDER BY t.created_at DESC LIMIT 100`)) as unknown as Omit<Transfer, "lines">[];
    if (!rows.length) return [];
    const lines = (await tx.execute(sql`
      SELECT l.transfer_id AS "transferId", l.menu_item_id AS "menuItemId", i.name, i.sku, l.quantity, l.received_quantity AS "receivedQuantity"
      FROM fnb.stock_transfer_lines l JOIN fnb.menu_items i ON i.id = l.menu_item_id ORDER BY i.name`)) as unknown as (Transfer["lines"][number] & { transferId: string })[];
    return rows.map((r) => ({ ...r, lines: lines.filter((l) => l.transferId === r.id).map(({ transferId, ...l }) => l) }));
  });
}

export async function createTransfer(ctx: FnbContext, input: z.infer<typeof TransferInput>) {
  need(ctx);
  if (input.fromOutletId === input.toOutletId) throw new AppError(422, "same_outlet", "Cabang asal dan tujuan harus berbeda.");
  const merged = new Map<string, number>();
  for (const l of input.lines) merged.set(l.menuItemId, (merged.get(l.menuItemId) ?? 0) + l.quantity);
  return inBusiness(ctx, async (tx) => {
    const outlets = (await tx.execute(sql`SELECT id FROM fnb.outlets WHERE archived_at IS NULL AND id IN (${input.fromOutletId}::uuid, ${input.toOutletId}::uuid)`)) as unknown as unknown[];
    if (outlets.length !== 2) throw notFound("Cabang");
    const ids = [...merged.keys()];
    const items = (await tx.execute(sql`SELECT id FROM fnb.menu_items WHERE archived_at IS NULL AND track_stock AND id IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`)) as unknown as unknown[];
    if (items.length !== ids.length) throw new AppError(422, "not_tracked", "Hanya menu dengan 'lacak stok' yang bisa ditransfer.");
    const [seq] = (await tx.execute(sql`SELECT count(*)::int + 1 AS n FROM fnb.stock_transfers`)) as unknown as { n: number }[];
    const number = `TRF-${String(seq!.n).padStart(4, "0")}`;
    const [row] = (await tx.execute(sql`
      INSERT INTO fnb.stock_transfers (business_id, number, from_outlet_id, to_outlet_id, note, created_by)
      VALUES (${ctx.businessId}::uuid, ${number}, ${input.fromOutletId}::uuid, ${input.toOutletId}::uuid, ${input.note || null}, ${ctx.userId}::uuid) RETURNING id`)) as unknown as { id: string }[];
    for (const [itemId, quantity] of merged) {
      await tx.execute(sql`INSERT INTO fnb.stock_transfer_lines (business_id, transfer_id, menu_item_id, quantity) VALUES (${ctx.businessId}::uuid, ${row!.id}::uuid, ${itemId}::uuid, ${quantity})`);
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.transfer.created", targetType: "stock_transfer", targetId: row!.id, meta: { number, lines: merged.size } });
    return { id: row!.id, number };
  });
}

type Locked = { id: string; number: string; status: string; from: string; to: string };
async function lock(tx: Parameters<Parameters<typeof withContext>[2]>[0], id: string): Promise<Locked> {
  const [t] = (await tx.execute(sql`SELECT id, number, status, from_outlet_id AS "from", to_outlet_id AS "to" FROM fnb.stock_transfers WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as Locked[];
  if (!t) throw notFound("Transfer");
  return t;
}
const sentLines = async (tx: Parameters<Parameters<typeof withContext>[2]>[0], id: string) =>
  (await tx.execute(sql`SELECT menu_item_id AS "menuItemId", quantity FROM fnb.stock_transfer_lines WHERE transfer_id = ${id}::uuid ORDER BY menu_item_id`)) as unknown as { menuItemId: string; quantity: number }[];

/** Kirim: stok cabang asal langsung berkurang, barang "dalam perjalanan" sampai cabang tujuan menerima. */
export async function sendTransfer(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const t = await lock(tx, id);
    if (t.status !== "draft") throw new AppError(409, "not_draft", "Transfer ini sudah dikirim atau dibatalkan.");
    for (const l of await sentLines(tx, id)) await changeItemStock(tx, ctx, t.from, l.menuItemId, -l.quantity, `Transfer ${t.number} dikirim`, "transfer", id);
    await tx.execute(sql`UPDATE fnb.stock_transfers SET status = 'dikirim', sent_at = now(), sent_by = ${ctx.userId}::uuid WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.transfer.sent", targetType: "stock_transfer", targetId: id, meta: { number: t.number } });
  });
}

/** Terima: jumlah diterima per barang (boleh kurang dari dikirim, selisih tercatat). Tidak boleh lebih dari yang dikirim. */
export async function receiveTransfer(ctx: FnbContext, id: string, input: z.infer<typeof TransferReceiveInput>) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const t = await lock(tx, id);
    if (t.status !== "dikirim") throw new AppError(409, "not_sent", "Hanya transfer yang sudah dikirim yang bisa diterima.");
    const sent = await sentLines(tx, id);
    const got = new Map(input.lines.map((l) => [l.menuItemId, l.quantity]));
    for (const l of sent) {
      const qty = got.get(l.menuItemId) ?? l.quantity;
      if (qty > l.quantity) throw new AppError(422, "over_received", "Jumlah diterima tidak boleh melebihi yang dikirim.");
      if (qty > 0) await changeItemStock(tx, ctx, t.to, l.menuItemId, qty, `Transfer ${t.number} diterima`, "transfer", id);
      await tx.execute(sql`UPDATE fnb.stock_transfer_lines SET received_quantity = ${qty} WHERE transfer_id = ${id}::uuid AND menu_item_id = ${l.menuItemId}::uuid`);
    }
    await tx.execute(sql`UPDATE fnb.stock_transfers SET status = 'diterima', received_at = now(), received_by = ${ctx.userId}::uuid WHERE id = ${id}::uuid`);
    const shortage = sent.reduce((s, l) => s + l.quantity - (got.get(l.menuItemId) ?? l.quantity), 0);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.transfer.received", targetType: "stock_transfer", targetId: id, meta: { number: t.number, shortage } });
  });
}

/** Batal: draft cukup ditandai; yang sudah dikirim dikembalikan ke cabang asal. */
export async function cancelTransfer(ctx: FnbContext, id: string) {
  need(ctx);
  await inBusiness(ctx, async (tx) => {
    const t = await lock(tx, id);
    if (t.status === "diterima" || t.status === "dibatalkan") throw new AppError(409, "closed", "Transfer ini sudah selesai atau dibatalkan.");
    if (t.status === "dikirim") for (const l of await sentLines(tx, id)) await changeItemStock(tx, ctx, t.from, l.menuItemId, l.quantity, `Transfer ${t.number} dibatalkan`, "transfer", id);
    await tx.execute(sql`UPDATE fnb.stock_transfers SET status = 'dibatalkan', cancelled_at = now() WHERE id = ${id}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "fnb.transfer.cancelled", targetType: "stock_transfer", targetId: id, meta: { number: t.number } });
  });
}
