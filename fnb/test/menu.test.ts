import { describe, expect, it } from "vitest";
import { archiveItem, listCatalog, listPriceChanges, updateItem } from "@/server/catalog";
import { archiveModifierGroup, listModifierGroups, saveModifierGroup, setItemGroups } from "@/server/modifiers";
import { createOrder, listOrders } from "@/server/orders";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

async function setup() {
  const biz = await businessOf(`Kafe Menu ${Math.random()}`);
  const itemId = await menuItemOf(biz.ctx, "Es kopi", 20000);
  const { id: size } = await saveModifierGroup(biz.ctx, {
    name: "Ukuran", minSelect: 1, maxSelect: 1,
    modifiers: [{ name: "Reguler", priceDelta: 0, available: true }, { name: "Besar", priceDelta: 5000, available: true }],
  });
  const { id: topping } = await saveModifierGroup(biz.ctx, {
    name: "Topping", minSelect: 0, maxSelect: 2,
    modifiers: [{ name: "Boba", priceDelta: 4000, available: true }, { name: "Jelly", priceDelta: 3000, available: true }, { name: "Cheese", priceDelta: 6000, available: false }],
  });
  await setItemGroups(biz.ctx, itemId, { groupIds: [size, topping] });
  const groups = await listModifierGroups(biz.ctx);
  const opt = (g: string, n: string) => groups.find((x) => x.name === g)!.modifiers.find((m) => m.name === n)!.id;
  return { biz, itemId, groups, opt };
}

describe("varian dan add-on", () => {
  it("menghitung harga dari opsi dan menyimpan salinannya di pesanan", async () => {
    const { biz, itemId, opt } = await setup();
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity: 2, modifierIds: [opt("Ukuran", "Besar"), opt("Topping", "Boba"), opt("Topping", "Jelly")] }] });
    const [order] = await listOrders(biz.ctx);
    expect(order!.total).toBe((20000 + 5000 + 4000 + 3000) * 2);
    expect(order!.lines[0]!.price).toBe(32000);
    expect(order!.lines[0]!.modifiers.map((m) => m.name).sort()).toEqual(["Besar", "Boba", "Jelly"]);

    // Mengubah harga opsi sesudahnya tidak mengubah pesanan lama.
    const g = (await listModifierGroups(biz.ctx)).find((x) => x.name === "Ukuran")!;
    await saveModifierGroup(biz.ctx, { id: g.id, name: "Ukuran", minSelect: 1, maxSelect: 1, modifiers: g.modifiers.map((m) => ({ ...m, priceDelta: m.priceDelta + 1000 })) });
    expect((await listOrders(biz.ctx))[0]!.total).toBe(64000);
  });

  it("menegakkan minimal, maksimal, ketersediaan, dan keanggotaan grup", async () => {
    const { biz, itemId, opt } = await setup();
    const order = (modifierIds: string[]) => createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity: 1, modifierIds }] });
    await rejects(order([]), "modifier_min");
    await rejects(order([opt("Ukuran", "Reguler"), opt("Ukuran", "Besar")]), "modifier_max");
    await rejects(order([opt("Ukuran", "Reguler"), opt("Topping", "Cheese")]), "modifier_unavailable");
    await rejects(order(["00000000-0000-4000-8000-000000000000"]), "modifier_invalid");
    const other = await menuItemOf(biz.ctx, "Air putih", 3000);
    await rejects(createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: other, quantity: 1, modifierIds: [opt("Topping", "Boba")] }] }), "modifier_invalid");
  });

  it("opsi bisnis lain tidak bisa dipakai", async () => {
    const a = await setup();
    const b = await setup();
    await rejects(createOrder(a.biz.ctx, { type: "takeaway", lines: [{ menuItemId: a.itemId, quantity: 1, modifierIds: [a.opt("Ukuran", "Reguler"), b.opt("Topping", "Boba")] }] }), "modifier_invalid");
  });

  it("mengarsipkan grup melepasnya dari menu", async () => {
    const { biz, itemId, groups } = await setup();
    for (const g of groups) await archiveModifierGroup(biz.ctx, g.id);
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity: 1 }] });
    expect((await listCatalog(biz.ctx)).groups).toHaveLength(0);
  });

  it("hanya yang berizin mengelola menu", async () => {
    const { biz, itemId } = await setup();
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(saveModifierGroup(cashier, { name: "X", minSelect: 0, maxSelect: 1, modifiers: [{ name: "a", priceDelta: 0, available: true }] }), "forbidden");
    await rejects(setItemGroups(cashier, itemId, { groupIds: [] }), "forbidden");
    await rejects(archiveItem(cashier, itemId), "FORBIDDEN");
  });
});

describe("ubah menu dan riwayat harga", () => {
  it("mencatat perubahan harga dan tidak mengubah pesanan lama", async () => {
    const biz = await businessOf(`Kafe Harga ${Math.random()}`);
    const itemId = await menuItemOf(biz.ctx, "Nasi goreng", 25000);
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity: 1 }] });
    const cat = await listCatalog(biz.ctx);
    await updateItem(biz.ctx, itemId, { name: "Nasi goreng spesial", description: null, categoryId: cat.categories[0]!.id, stationId: null, price: 30000 });
    expect((await listPriceChanges(biz.ctx, itemId)).map((p) => [p.oldPrice, p.newPrice])).toEqual([[25000, 30000]]);
    expect((await listOrders(biz.ctx))[0]!.total).toBe(25000);
    expect((await listOrders(biz.ctx))[0]!.lines[0]!.name).toBe("Nasi goreng");
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity: 1 }] });
    expect((await listOrders(biz.ctx)).map((o) => o.total).sort()).toEqual([25000, 30000]);
  });

  it("menu yang diarsipkan hilang dari katalog dan tidak bisa dipesan", async () => {
    const biz = await businessOf(`Kafe Arsip ${Math.random()}`);
    const itemId = await menuItemOf(biz.ctx);
    await archiveItem(biz.ctx, itemId);
    expect((await listCatalog(biz.ctx)).items).toHaveLength(0);
    await rejects(createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity: 1 }] }), "NOT_FOUND");
  });
});
