import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { archiveCategory, createCatalog, listCatalog, updateCategory, updateItem } from "@/server/catalog";
import { adjustItemStock, listItemStock } from "@/server/item-stock";
import { listModifierGroups, saveModifierGroup, setItemGroups } from "@/server/modifiers";
import { createOrder, listOrders, updateOrderStatus } from "@/server/orders";
import { db } from "@/server/db";
import { updateSettings } from "@/server/settings";
import { createIngredient, listStock } from "@/server/stock";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

const query = <T>(biz: { id: string; ctx: { userId: string } }, q: ReturnType<typeof sql>) =>
  withContext(db(), { userId: biz.ctx.userId, businessId: biz.id }, async (tx) => (await tx.execute(q)) as unknown as T[]);

async function setup() {
  const biz = await businessOf(`Kafe Katalog ${Math.random()}`);
  const { id: categoryId } = await createCatalog(biz.ctx, { type: "category", name: "Minuman" });
  const item = (extra: object = {}) => createCatalog(biz.ctx, { type: "item", name: `Menu ${Math.random()}`, categoryId, stationId: null, price: 10000, ...extra } as never);
  return { biz, categoryId, item };
}

describe("katalog lengkap", () => {
  it("menolak SKU dan barcode ganda dalam satu bisnis, tapi boleh di bisnis lain", async () => {
    const { item } = await setup();
    await item({ sku: "ES-01", barcode: "899001" });
    await rejects(item({ sku: "es-01" }), "duplicate");
    await rejects(item({ barcode: "899001" }), "duplicate");
    const other = await setup();
    await expect(other.item({ sku: "ES-01", barcode: "899001" })).resolves.toBeTruthy();
  });

  it("menolak URL gambar yang bukan dari Cloudinary bisnis ini", async () => {
    const { item } = await setup();
    await rejects(item({ imageUrl: "https://evil.example/x.png" }), "invalid_image");
  });

  it("menyimpan HPP di baris pesanan dan tidak berubah saat menu diubah", async () => {
    const { biz, item, categoryId } = await setup();
    const { id } = await item({ cost: 4000, price: 12000 });
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: id, quantity: 2 }] });
    await updateItem(biz.ctx, id, { name: "Baru", categoryId, stationId: null, price: 15000, cost: 9000 });
    const [order] = await listOrders(biz.ctx);
    expect(order!.total).toBe(24000);
    const [line] = await query<{ unitCost: number }>(biz, sql`SELECT unit_cost AS "unitCost" FROM fnb.order_lines`);
    expect(line!.unitCost).toBe(4000);
  });

  it("menu bebas pajak tidak ikut dikenai pajak", async () => {
    const { biz, item } = await setup();
    await updateSettings(biz.ctx, { taxPercent: 10, servicePercent: 0, receiptPrefix: "INV", receiptHeader: "", receiptFooter: "" });
    const taxed = await item({ price: 10000 });
    const free = await item({ price: 10000, taxable: false });
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: taxed.id, quantity: 1 }, { menuItemId: free.id, quantity: 1 }] });
    const [order] = await listOrders(biz.ctx);
    expect(order).toMatchObject({ total: 21000 });
  });

  it("memotong stok barang jadi, menolak jika kurang, mengembalikan saat batal", async () => {
    const { biz, item } = await setup();
    const { id } = await item({ trackStock: true, minStock: 2 });
    await rejects(createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: id, quantity: 1 }] }), "ITEM_UNAVAILABLE");
    await adjustItemStock(biz.ctx, id, { quantity: 5, reason: "Stok awal" });
    await rejects(createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: id, quantity: 6 }] }), "INSUFFICIENT_STOCK");
    const o = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: id, quantity: 3 }] });
    const rows = async () => {
      const [outlet] = await query<{ id: string }>(biz, sql`SELECT id FROM fnb.outlets WHERE is_primary`);
      return listItemStock(biz.ctx, outlet!.id);
    };
    expect((await rows()).find((r) => r.id === id)).toMatchObject({ stock: 2, low: true });
    await updateOrderStatus(biz.ctx, o.id, "cancelled", "Batal tes");
    expect((await rows()).find((r) => r.id === id)!.stock).toBe(5);
  });

  it("add-on yang terhubung bahan memotong stok bahan", async () => {
    const { biz, item } = await setup();
    const { id: milk } = await createIngredient(biz.ctx, { name: "Susu", unit: "ml", openingStock: 1000 });
    const { id: group } = await saveModifierGroup(biz.ctx, { name: "Tambahan", minSelect: 0, maxSelect: 1, modifiers: [{ name: "Susu extra", priceDelta: 3000, available: true, ingredientId: milk, ingredientQty: 50 }] });
    const { id } = await item();
    await setItemGroups(biz.ctx, id, { groupIds: [group] });
    const mod = (await listModifierGroups(biz.ctx))[0]!.modifiers[0]!.id;
    await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: id, quantity: 2, modifierIds: [mod] }] });
    expect((await listStock(biz.ctx)).ingredients.find((i) => i.id === milk)!.stock).toBe(900);
  });

  it("kategori berisi menu tidak bisa diarsipkan; kategori nonaktif hilang dari kasir", async () => {
    const { biz, categoryId, item } = await setup();
    await item();
    await rejects(archiveCategory(biz.ctx, categoryId), "category_in_use");
    await updateCategory(biz.ctx, categoryId, { name: "Minuman", isActive: false, sortOrder: 1 });
    expect((await listCatalog(biz.ctx, { forPos: true })).items).toHaveLength(0);
    expect((await listCatalog(biz.ctx)).items).toHaveLength(1);
  });

  it("kasir tidak boleh mengubah katalog atau stok", async () => {
    const { biz, item } = await setup();
    const { id } = await item({ trackStock: true });
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(adjustItemStock(cashier, id, { quantity: 1, reason: "coba" }), "forbidden");
  });
});
