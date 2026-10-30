import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { archiveBranch, branchOverview, cancelBranchRequest, createBranch, requestBranch, updateBranch } from "@/server/branches";
import { createCatalog } from "@/server/catalog";
import { db } from "@/server/db";
import { adjustItemStock, listItemStock } from "@/server/item-stock";
import { listOutletItems, saveOutletItem } from "@/server/outlet-items";
import { cancelTransfer, createTransfer, listTransfers, receiveTransfer, sendTransfer } from "@/server/transfers";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

async function setup() {
  const biz = await businessOf(`Kafe Cabang ${Math.random()}`);
  const { id: cat } = await createCatalog(biz.ctx, { type: "category", name: "Roti" });
  const { id: item } = await createCatalog(biz.ctx, { type: "item", name: "Roti sobek", categoryId: cat, stationId: null, price: 15000, cost: 7000, trackStock: true });
  await adjustItemStock(biz.ctx, item, { quantity: 20, reason: "Stok awal" });
  return { biz, item };
}
// Admin SatuRoom menaikkan jatah lewat SQL; tes meniru langkah itu.
const raise = (businessId: string, n: number) => withContext(db(), { userId: null, businessId }, (tx) => tx.execute(sql`INSERT INTO fnb.business_limits (business_id, outlet_limit) VALUES (${businessId}::uuid, ${n}) ON CONFLICT (business_id) DO UPDATE SET outlet_limit = ${n}`));

describe("cabang", () => {
  it("jatah cabang 1 gratis, permintaan satu per waktu, dan cabang baru hanya setelah jatah dinaikkan", async () => {
    const { biz } = await setup();
    expect((await branchOverview(biz.ctx))).toMatchObject({ limit: 1, used: 1 });
    await rejects(createBranch(biz.ctx, { name: "Cabang Dago" }), "branch_limit");
    const r = await requestBranch(biz.ctx, { name: "Cabang Dago", note: "Buka bulan depan" });
    await rejects(requestBranch(biz.ctx, { name: "Cabang Lain" }), "request_open");
    await cancelBranchRequest(biz.ctx, r.id);
    await requestBranch(biz.ctx, { name: "Cabang Dago" });
    await raise(biz.ctx.businessId, 2);
    const b = await createBranch(biz.ctx, { name: "Cabang Dago", address: "Jl. Dago 1" });
    await rejects(createBranch(biz.ctx, { name: "Cabang Lagi" }), "branch_limit");
    await updateBranch(biz.ctx, b.id, { name: "Dago Atas" });
    expect((await branchOverview(biz.ctx)).branches.map((x) => x.name)).toEqual(["Outlet utama", "Dago Atas"]);
    await archiveBranch(biz.ctx, b.id);
    expect((await branchOverview(biz.ctx)).used).toBe(1);
    const main = (await branchOverview(biz.ctx)).branches[0]!;
    await rejects(archiveBranch(biz.ctx, main.id), "primary_branch");
  });

  it("barang per cabang: harga, HPP, ketersediaan memakai pengaturan cabang dan tidak bocor ke bisnis lain", async () => {
    const { biz, item } = await setup();
    await raise(biz.ctx.businessId, 2);
    const b = await createBranch(biz.ctx, { name: "Cabang B" });
    await saveOutletItem(biz.ctx, b.id, item, { price: 18000, cost: 8000, isAvailable: false, minStock: 3 });
    const rows = await listOutletItems(biz.ctx, b.id);
    expect(rows[0]).toMatchObject({ basePrice: 15000, price: 18000, cost: 8000, isAvailable: false, minStock: 3 });
    const other = await businessOf(`Kafe Lain ${Math.random()}`);
    await rejects(listOutletItems(other.ctx, b.id), "not_found");
    await rejects(saveOutletItem(other.ctx, b.id, item, { price: 1, cost: null, isAvailable: true, minStock: null }), "not_found");
    await rejects(listOutletItems(await staffOf(biz, ["cashier"]), b.id), "forbidden");
  });

  it("transfer stok: kirim memotong asal, terima menambah tujuan, selisih dicatat, batal mengembalikan", async () => {
    const { biz, item } = await setup();
    await raise(biz.ctx.businessId, 2);
    const b = await createBranch(biz.ctx, { name: "Cabang B" });
    const main = (await branchOverview(biz.ctx)).branches.find((x) => x.isPrimary)!;
    const stock = async (o: string) => (await listItemStock(biz.ctx, o))[0]!.stock;

    await rejects(createTransfer(biz.ctx, { fromOutletId: main.id, toOutletId: main.id, lines: [{ menuItemId: item, quantity: 1 }] }), "same_outlet");
    const t = await createTransfer(biz.ctx, { fromOutletId: main.id, toOutletId: b.id, lines: [{ menuItemId: item, quantity: 8 }] });
    expect(await stock(main.id)).toBe(20);
    await sendTransfer(biz.ctx, t.id);
    await rejects(sendTransfer(biz.ctx, t.id), "not_draft");
    expect(await stock(main.id)).toBe(12);
    expect(await stock(b.id)).toBe(0);
    await rejects(receiveTransfer(biz.ctx, t.id, { lines: [{ menuItemId: item, quantity: 9 }] }), "over_received");
    await receiveTransfer(biz.ctx, t.id, { lines: [{ menuItemId: item, quantity: 7 }] });
    expect(await stock(b.id)).toBe(7);
    await rejects(cancelTransfer(biz.ctx, t.id), "closed");
    const listed = (await listTransfers(biz.ctx))[0]!;
    expect(listed).toMatchObject({ status: "diterima", number: "TRF-0001" });
    expect(listed.lines[0]).toMatchObject({ quantity: 8, receivedQuantity: 7 });

    const t2 = await createTransfer(biz.ctx, { fromOutletId: main.id, toOutletId: b.id, lines: [{ menuItemId: item, quantity: 5 }] });
    await sendTransfer(biz.ctx, t2.id);
    await cancelTransfer(biz.ctx, t2.id);
    expect(await stock(main.id)).toBe(12);
    const t3 = await createTransfer(biz.ctx, { fromOutletId: main.id, toOutletId: b.id, lines: [{ menuItemId: item, quantity: 99 }] });
    await rejects(sendTransfer(biz.ctx, t3.id), "INSUFFICIENT_STOCK");
    expect(await stock(main.id)).toBe(12);
    await rejects(archiveBranch(biz.ctx, b.id), "branch_has_stock");
  });
});
