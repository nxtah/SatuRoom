import { describe, expect, it } from "vitest";
import { createOrder, updateOrderStatus } from "@/server/orders";
import { adjustStock, createIngredient, listStock, setRecipe } from "@/server/stock";
import { listCatalog } from "@/server/catalog";
import { businessOf, menuItemOf, staffOf } from "./helpers";

async function setup() {
  const biz = await businessOf(`Kafe ${Math.random()}`);
  const itemId = await menuItemOf(biz.ctx);
  const { id: rice } = await createIngredient(biz.ctx, { name: "Beras", unit: "kg", openingStock: 1, minimumStock: 0.2 });
  await setRecipe(biz.ctx, { menuItemId: itemId, lines: [{ ingredientId: rice, quantity: 0.25 }] });
  const order = (qty: number) => createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity: qty }] });
  const stock = async () => (await listStock(biz.ctx)).ingredients.find((i) => i.id === rice)!.stock;
  return { biz, itemId, rice, order, stock };
}

describe("stok bahan", () => {
  it("memotong stok sesuai resep saat pesanan dibuat", async () => {
    const { order, stock } = await setup();
    await order(2);
    expect(await stock()).toBe(0.5);
  });

  it("mengembalikan stok saat pesanan dibatalkan", async () => {
    const { order, stock, biz } = await setup();
    const created = await order(2);
    await updateOrderStatus(biz.ctx, created.id, "cancelled", "Batal dari tes");
    expect(await stock()).toBe(1);
  });

  it("menolak pesanan bila bahan tidak cukup dan stok tidak berubah", async () => {
    const { order, stock } = await setup();
    await expect(order(5)).rejects.toThrow("INSUFFICIENT_STOCK");
    expect(await stock()).toBe(1);
  });

  it("menandai menu habis otomatis saat bahan kurang dari satu porsi", async () => {
    const { order, biz, itemId } = await setup();
    await order(4);
    const item = (await listCatalog(biz.ctx)).items.find((i) => i.id === itemId)!;
    expect(item.available).toBe(false);
  });

  it("menolak penyesuaian yang membuat stok minus", async () => {
    const { biz, rice } = await setup();
    await expect(adjustStock(biz.ctx, rice, { quantity: -2, reason: "Rusak" })).rejects.toThrow("BELOW_ZERO");
    expect((await adjustStock(biz.ctx, rice, { quantity: 0.5, reason: "Belanja" })).stock).toBe(1.5);
  });

  it("hanya owner, manajer, dan inventory yang boleh mengelola stok", async () => {
    const { biz, rice } = await setup();
    const cashier = await staffOf(biz, ["cashier"]);
    await expect(createIngredient(cashier, { name: "Gula", unit: "kg" })).rejects.toThrow("FORBIDDEN");
    await expect(adjustStock(cashier, rice, { quantity: 1, reason: "Coba" })).rejects.toThrow("FORBIDDEN");
    const inventory = await staffOf(biz, ["inventory"]);
    await expect(createIngredient(inventory, { name: "Gula", unit: "kg" })).resolves.toHaveProperty("id");
  });

  it("tidak membocorkan bahan antar-bisnis", async () => {
    const a = await setup();
    const b = await businessOf(`Kafe lain ${Math.random()}`);
    expect((await listStock(b.ctx)).ingredients).toHaveLength(0);
    await expect(adjustStock(b.ctx, a.rice, { quantity: 1, reason: "Curang" })).rejects.toThrow("NOT_FOUND");
  });
});
