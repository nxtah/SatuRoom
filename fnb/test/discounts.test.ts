import { describe, expect, it } from "vitest";
import { createCatalog } from "@/server/catalog";
import { archiveDiscount, jakartaNow, listDiscounts, quoteDiscounts, saveDiscount } from "@/server/discounts";
import { archiveOrderType, listOrderTypes, saveOrderType } from "@/server/order-types";
import { createOrder, listOrders, updateOrderStatus } from "@/server/orders";
import { updateSettings } from "@/server/settings";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);
const base = { kind: "percent" as const, scope: "order" as const, minSpend: 0, days: [0, 1, 2, 3, 4, 5, 6], orderTypeIds: [], autoApply: false, active: true };

async function setup() {
  const biz = await businessOf(`Kafe Diskon ${Math.random()}`);
  await updateSettings(biz.ctx, { taxPercent: 10, servicePercent: 5, receiptPrefix: "INV", receiptHeader: "", receiptFooter: "" });
  const { id: drinks } = await createCatalog(biz.ctx, { type: "category", name: "Minuman" });
  const { id: food } = await createCatalog(biz.ctx, { type: "category", name: "Makanan" });
  const { id: coffee } = await createCatalog(biz.ctx, { type: "item", name: "Kopi", categoryId: drinks, stationId: null, price: 20000 });
  const { id: rice } = await createCatalog(biz.ctx, { type: "item", name: "Nasi", categoryId: food, stationId: null, price: 30000 });
  const types = await listOrderTypes(biz.ctx);
  return { biz, coffee, rice, drinks, types, dineIn: types.find((t) => t.kind === "dine_in")!, takeaway: types.find((t) => t.kind === "takeaway")! };
}

describe("tipe pesanan", () => {
  it("menyediakan tiga tipe dasar dan memakai tarif sendiri bila diisi", async () => {
    const { biz, coffee, takeaway } = await setup();
    expect((await listOrderTypes(biz.ctx)).map((t) => t.name)).toEqual(["Makan di tempat", "Bungkus", "Ambil sendiri"]);
    await createOrder(biz.ctx, { orderTypeId: takeaway.id, lines: [{ menuItemId: coffee, quantity: 1 }] });
    expect((await listOrders(biz.ctx))[0]).toMatchObject({ total: 23100, typeName: "Bungkus", type: "takeaway" });
    const { id } = await saveOrderType(biz.ctx, { name: "Ojol", kind: "takeaway", servicePercent: 0, taxPercent: 0, requireTable: false, isActive: true, sortOrder: 5 });
    await createOrder(biz.ctx, { orderTypeId: id, lines: [{ menuItemId: coffee, quantity: 1 }] });
    expect((await listOrders(biz.ctx)).find((o) => o.typeName === "Ojol")!.total).toBe(20000);
  });

  it("tipe dasar tetap ada walau tipe pertama dibuat sebelum daftar dibuka", async () => {
    const biz = await businessOf(`Kafe Tipe ${Math.random()}`);
    await saveOrderType(biz.ctx, { name: "GoFood", kind: "takeaway", requireTable: false, isActive: true, sortOrder: 9 });
    expect((await listOrderTypes(biz.ctx)).map((t) => t.name)).toEqual(["Makan di tempat", "Bungkus", "Ambil sendiri", "GoFood"]);
  });

  it("mewajibkan meja, menolak nama ganda, dan menjaga minimal satu tipe aktif", async () => {
    const { biz, coffee, types } = await setup();
    const { id } = await saveOrderType(biz.ctx, { name: "Meja VIP", kind: "dine_in", requireTable: true, isActive: true, sortOrder: 9 });
    await rejects(createOrder(biz.ctx, { orderTypeId: id, lines: [{ menuItemId: coffee, quantity: 1 }] }), "table_required");
    await rejects(saveOrderType(biz.ctx, { name: "bungkus", kind: "takeaway", requireTable: false, isActive: true, sortOrder: 0 }), "duplicate");
    for (const t of types) await archiveOrderType(biz.ctx, t.id).catch(() => null);
    await archiveOrderType(biz.ctx, id).catch((e) => expect(e.code).toBe("last_type"));
    expect((await listOrderTypes(biz.ctx)).some((t) => t.isActive)).toBe(true);
  });

  it("kasir tidak boleh mengubah tipe pesanan", async () => {
    const { biz } = await setup();
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(saveOrderType(cashier, { name: "X", kind: "takeaway", requireTable: false, isActive: true, sortOrder: 0 }), "forbidden");
  });
});

describe("diskon bernama", () => {
  it("memotong seluruh pesanan, atau hanya satu kategori, dan tercatat di pesanan", async () => {
    const { biz, coffee, rice, drinks, dineIn } = await setup();
    const all = (await saveDiscount(biz.ctx, { ...base, name: "Promo 10%", value: 10 })).id;
    const cat = (await saveDiscount(biz.ctx, { ...base, name: "Minuman 50%", value: 50, scope: "category", categoryId: drinks })).id;
    const lines = [{ menuItemId: coffee, quantity: 1 }, { menuItemId: rice, quantity: 1 }];
    const quote = await quoteDiscounts(biz.ctx, { orderTypeId: dineIn.id, lines });
    expect(quote.find((q) => q.id === all)!.amount).toBe(5000);
    expect(quote.find((q) => q.id === cat)!.amount).toBe(10000);
    await createOrder(biz.ctx, { orderTypeId: dineIn.id, discountId: cat, lines });
    const [order] = await listOrders(biz.ctx);
    expect(order).toMatchObject({ discount: 10000, subtotal: 50000 });
    expect((await listDiscounts(biz.ctx)).find((d) => d.id === cat)).toMatchObject({ usedCount: 1, givenTotal: 10000 });
    await updateOrderStatus(biz.ctx, order!.id, "cancelled", "Batal tes");
    expect((await listDiscounts(biz.ctx)).find((d) => d.id === cat)!.usedCount).toBe(0);
  });

  it("menolak diskon di luar jadwal atau di bawah minimal belanja", async () => {
    const { biz, coffee } = await setup();
    const other = (jakartaNow().day + 1) % 7;
    const off = (await saveDiscount(biz.ctx, { ...base, name: "Hari lain", value: 10, days: [other] })).id;
    const min = (await saveDiscount(biz.ctx, { ...base, name: "Minimal besar", value: 10, minSpend: 100000 })).id;
    await rejects(createOrder(biz.ctx, { discountId: off, lines: [{ menuItemId: coffee, quantity: 1 }] }), "discount_invalid");
    await rejects(createOrder(biz.ctx, { discountId: min, lines: [{ menuItemId: coffee, quantity: 1 }] }), "discount_invalid");
    await createOrder(biz.ctx, { discountId: min, lines: [{ menuItemId: coffee, quantity: 5 }] });
  });

  it("diskon otomatis ikut terpasang, dan tidak bersama voucher atau diskon manual", async () => {
    const { biz, coffee } = await setup();
    await saveDiscount(biz.ctx, { ...base, name: "Happy hour", value: 20, autoApply: true });
    await createOrder(biz.ctx, { lines: [{ menuItemId: coffee, quantity: 1 }] });
    expect((await listOrders(biz.ctx))[0]!.discount).toBe(4000);
    const named = (await listDiscounts(biz.ctx))[0]!.id;
    await rejects(createOrder(biz.ctx, { discountId: named, discountType: "amount", discountValue: 1000, discountReason: "Manual", lines: [{ menuItemId: coffee, quantity: 1 }] }), "voucher_conflict");
  });

  it("diskon nonaktif tidak berlaku dan hanya yang berizin bisa mengatur", async () => {
    const { biz, coffee } = await setup();
    const id = (await saveDiscount(biz.ctx, { ...base, name: "Mati", value: 10, active: false })).id;
    await rejects(createOrder(biz.ctx, { discountId: id, lines: [{ menuItemId: coffee, quantity: 1 }] }), "discount_invalid");
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(saveDiscount(cashier, { ...base, name: "Curang", value: 90 }), "forbidden");
    await archiveDiscount(biz.ctx, id);
    expect(await listDiscounts(biz.ctx)).toHaveLength(0);
  });
});
