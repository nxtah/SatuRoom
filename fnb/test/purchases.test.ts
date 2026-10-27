import { describe, expect, it } from "vitest";
import { createSupplier, listPurchases, listSuppliers, recordPurchase } from "@/server/purchases";
import { createIngredient, listStock } from "@/server/stock";
import { businessOf, staffOf } from "./helpers";

const stockOf = async (biz: Awaited<ReturnType<typeof businessOf>>, id: string) =>
  (await listStock(biz.ctx)).ingredients.find((i) => i.id === id)!;

describe("pembelian bahan", () => {
  it("menambah stok dan menghitung harga rata-rata tertimbang", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const { id } = await createIngredient(biz.ctx, { name: "Beras", unit: "kg", openingStock: 10, averageCost: 12000 });
    const { id: sup } = await createSupplier(biz.ctx, { name: "Toko Maju" });
    const res = await recordPurchase(biz.ctx, { supplierId: sup, lines: [{ ingredientId: id, quantity: 10, unitCost: 14000 }] });
    expect(res.total).toBe(140000);
    const ing = await stockOf(biz, id);
    expect(ing).toMatchObject({ stock: 20, averageCost: 13000 });
    const [p] = await listPurchases(biz.ctx);
    expect(p).toMatchObject({ supplierName: "Toko Maju", total: 140000 });
    expect(p!.lines).toEqual([{ name: "Beras", unit: "kg", quantity: 10, unitCost: 14000 }]);
  });

  it("baris bahan yang sama digabung dan stok awal nol memakai harga beli", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const { id } = await createIngredient(biz.ctx, { name: "Gula", unit: "kg" });
    await recordPurchase(biz.ctx, { lines: [{ ingredientId: id, quantity: 2, unitCost: 10000 }, { ingredientId: id, quantity: 2, unitCost: 20000 }] });
    expect(await stockOf(biz, id)).toMatchObject({ stock: 4, averageCost: 15000 });
  });

  it("supplier kembar ditolak; izin dan isolasi antar-bisnis", async () => {
    const a = await businessOf(`Kafe A ${Math.random()}`);
    const b = await businessOf(`Kafe B ${Math.random()}`);
    const { id } = await createIngredient(a.ctx, { name: "Garam", unit: "kg" });
    await createSupplier(a.ctx, { name: "Toko Maju" });
    await expect(createSupplier(a.ctx, { name: "toko maju" })).rejects.toThrow("DUPLICATE");
    const cashier = await staffOf(a, ["cashier"]);
    await expect(recordPurchase(cashier, { lines: [{ ingredientId: id, quantity: 1, unitCost: 1000 }] })).rejects.toThrow("FORBIDDEN");
    await expect(recordPurchase(b.ctx, { lines: [{ ingredientId: id, quantity: 1, unitCost: 1000 }] })).rejects.toThrow("NOT_FOUND");
    expect(await listSuppliers(b.ctx)).toHaveLength(0);
    expect(await listPurchases(b.ctx)).toHaveLength(0);
    expect((await stockOf(a, id)).stock).toBe(0);
  });
});
