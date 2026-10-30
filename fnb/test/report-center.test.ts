import { describe, expect, it } from "vitest";
import { createCatalog } from "@/server/catalog";
import { saveDiscount } from "@/server/discounts";
import { createExpense } from "@/server/expenses";
import { adjustItemStock } from "@/server/item-stock";
import { createOrder, listOrders, updateOrderStatus } from "@/server/orders";
import { addCashMovement, closeShift, openShift, payOrder, refundPayment, voidPayment } from "@/server/payments";
import { buildReport, parseFilter, reportCsv, REPORTS, type ReportSlug } from "@/server/report-center";
import { todayJakarta } from "@/server/reports";
import { updateSettings } from "@/server/settings";
import { createIngredient, recordWaste, setRecipe } from "@/server/stock";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);
const today = todayJakarta();
const f = parseFilter({ dari: today, sampai: today }, today);
const rowOf = (rep: Awaited<ReturnType<typeof buildReport>>, section: number, key: string, value: string) => rep.sections[section]!.rows.find((r) => r[key] === value)!;

type Biz = Awaited<ReturnType<typeof businessOf>>;
async function ready(biz: Biz, id: string) {
  await updateOrderStatus(biz.ctx, id, "preparing");
  await updateOrderStatus(biz.ctx, id, "ready");
}

async function scenario() {
  const biz = await businessOf(`Kafe Lapor ${Math.random()}`);
  await updateSettings(biz.ctx, { taxPercent: 10, servicePercent: 0, receiptPrefix: "INV", receiptHeader: "", receiptFooter: "" });
  const { id: drinks } = await createCatalog(biz.ctx, { type: "category", name: "Minuman" });
  const { id: food } = await createCatalog(biz.ctx, { type: "category", name: "Makanan" });
  const { id: coffee } = await createCatalog(biz.ctx, { type: "item", name: "Kopi", categoryId: drinks, stationId: null, price: 20000, cost: 6000, sku: "KOPI" });
  const { id: rice } = await createCatalog(biz.ctx, { type: "item", name: "Nasi", categoryId: food, stationId: null, price: 30000, cost: 12000 });
  const { id: water } = await createCatalog(biz.ctx, { type: "item", name: "Air", categoryId: drinks, stationId: null, price: 5000, trackStock: true });
  await adjustItemStock(biz.ctx, water, { quantity: 10, reason: "Stok awal" });
  const { id: beans } = await createIngredient(biz.ctx, { name: "Biji kopi", unit: "gram", openingStock: 1000, averageCost: 100 });
  await setRecipe(biz.ctx, { menuItemId: coffee, lines: [{ ingredientId: beans, quantity: 20 }] });
  await openShift(biz.ctx, { openingCash: 100000 });
  const disc = (await saveDiscount(biz.ctx, { name: "Promo 10%", kind: "percent", value: 10, scope: "order", minSpend: 0, days: [0, 1, 2, 3, 4, 5, 6], orderTypeIds: [], autoApply: false, active: true })).id;
  // Nota 1: 2 kopi + 1 nasi = 70000, diskon 10% = 7000, pajak 10% dari 63000 = 6300 => 69300. Dibayar tunai.
  const o1 = await createOrder(biz.ctx, { discountId: disc, lines: [{ menuItemId: coffee, quantity: 2 }, { menuItemId: rice, quantity: 1 }] });
  await ready(biz, o1.id);
  const p1 = await payOrder(biz.ctx, { orderId: o1.id, amount: 69300, method: "cash", tendered: 70000 });
  // Nota 2: 1 nasi = 30000 + pajak 3000 = 33000, QRIS, lalu refund 3000.
  const o2 = await createOrder(biz.ctx, { lines: [{ menuItemId: rice, quantity: 1 }] });
  await ready(biz, o2.id);
  const p2 = await payOrder(biz.ctx, { orderId: o2.id, amount: 33000, method: "qris" });
  await refundPayment(biz.ctx, p2.id, { amount: 3000, reason: "Porsi kurang" });
  // Nota 3: dibatalkan.
  const o3 = await createOrder(biz.ctx, { lines: [{ menuItemId: water, quantity: 2 }] });
  await updateOrderStatus(biz.ctx, o3.id, "cancelled", "Pelanggan pergi");
  // Nota 4: pembayaran dibatalkan.
  const o4 = await createOrder(biz.ctx, { lines: [{ menuItemId: water, quantity: 1 }] });
  await ready(biz, o4.id);
  const p4 = await payOrder(biz.ctx, { orderId: o4.id, amount: 5500, method: "cash" });
  await voidPayment(biz.ctx, p4.id, { reason: "Salah input" });
  await addCashMovement(biz.ctx, { kind: "out", amount: 3000, category: "Operasional", reason: "Beli es batu" });
  await createExpense(biz.ctx, { amount: 10000, category: "Listrik", fromDrawer: true });
  await recordWaste(biz.ctx, beans, { quantity: 50, reason: "Tumpah" });
  await closeShift(biz.ctx, { closingCash: 100000 + 69300 - 3000 - 10000 - 4000 });
  return { biz, p1 };
}

describe("laporan rinci", () => {
  it("semua laporan terbentuk dan CSV-nya bisa diunduh", async () => {
    const { biz } = await scenario();
    for (const r of REPORTS) {
      const rep = await buildReport(biz.ctx, r.slug as ReportSlug, f);
      expect(rep.sections.length).toBeGreaterThan(0);
      expect(reportCsv(rep)).toContain(rep.sections[0]!.title);
    }
  });

  it("rincian penjualan: total sama dengan jumlah nota yang tidak dibatalkan", async () => {
    const { biz } = await scenario();
    const rep = await buildReport(biz.ctx, "penjualan", f);
    const orders = (await listOrders(biz.ctx, "all")).filter((o) => o.status !== "cancelled");
    expect(rep.summary.find((s) => s.label === "Jumlah nota")!.value).toBe(orders.length);
    expect(rep.sections[0]!.totals!.total).toBe(orders.reduce((s, o) => s + o.total, 0));
    expect(rep.sections[0]!.rows.find((r) => r.total === 69300)).toMatchObject({ discount: 7000, metode: "Tunai", tipe: "Makan di tempat" });
  });

  it("penjualan per produk: bersih, HPP, dan laba memakai nilai saat transaksi", async () => {
    const { biz } = await scenario();
    const rep = await buildReport(biz.ctx, "produk", f);
    const kopi = rowOf(rep, 0, "nama", "Kopi");
    expect(kopi).toMatchObject({ qty: 2, kotor: 40000, hpp: 12000, kategori: "Minuman", sku: "KOPI" });
    expect(kopi!.diskon).toBe(4000); // 40000/70000 * 7000
    expect(kopi!.laba).toBe(40000 - 4000 - 12000);
    const total = rep.sections[0]!.totals!;
    expect(total.bersih).toBe(Number(total.kotor) - Number(total.diskon));
  });

  it("penjualan per kategori menjumlah menu di dalamnya", async () => {
    const { biz } = await scenario();
    const rep = await buildReport(biz.ctx, "kategori", f);
    expect(rowOf(rep, 0, "nama", "Makanan")).toMatchObject({ qty: 2, kotor: 60000 });
    expect(rowOf(rep, 0, "nama", "Minuman")).toMatchObject({ jumlahMenu: 2 });
  });

  it("penerimaan: bersih per metode sudah dikurangi refund, pembayaran batal tidak dihitung", async () => {
    const { biz } = await scenario();
    const rep = await buildReport(biz.ctx, "penerimaan", f);
    expect(rowOf(rep, 0, "metode", "Tunai")).toMatchObject({ diterima: 69300, bersih: 69300 });
    expect(rowOf(rep, 0, "metode", "QRIS")).toMatchObject({ diterima: 33000, refund: 3000, bersih: 30000 });
    expect(rep.summary.find((s) => s.label === "Penerimaan bersih")!.value).toBe(99300);
  });

  it("tipe pesanan, diskon dan pajak menunjukkan potongan per jenis", async () => {
    const { biz } = await scenario();
    const type = await buildReport(biz.ctx, "tipe-pesanan", f);
    expect(rowOf(type, 0, "tipe", "Makan di tempat")).toMatchObject({ nota: 3 });
    const dp = await buildReport(biz.ctx, "diskon-pajak", f);
    expect(rowOf(dp, 0, "jenis", "Diskon Promo 10%")).toMatchObject({ nota: 1, potongan: 7000 });
    expect(dp.summary.find((s) => s.label === "Pajak")!.value).toBe(6300 + 3000 + 500);
  });

  it("penggunaan barang: bahan terpakai dan terbuang bernilai, barang jadi terjual", async () => {
    const { biz } = await scenario();
    const rep = await buildReport(biz.ctx, "pemakaian-bahan", f);
    expect(rowOf(rep, 0, "nama", "Biji kopi")).toMatchObject({ terpakai: 40, terbuang: 50, nilaiTerpakai: 4000, nilaiTerbuang: 5000 });
    expect(rowOf(rep, 1, "nama", "Air")).toMatchObject({ masuk: 10, terjual: 1 });
  });

  it("riwayat shift dan catatan kas cocok dengan kejadian", async () => {
    const { biz } = await scenario();
    const shift = (await buildReport(biz.ctx, "shift", f)).sections[0]!.rows[0]!;
    expect(shift).toMatchObject({ awal: 100000, tunai: 69300, keluar: 13000, hitung: 152300 });
    expect(shift.seharusnya).toBeDefined();
    const kas = await buildReport(biz.ctx, "kas", f);
    expect(kas.summary.find((s) => s.label === "Kas keluar")!.value).toBeGreaterThanOrEqual(13000);
  });

  it("pesanan dihapus mencatat alasan dan siapa yang membatalkan", async () => {
    const { biz } = await scenario();
    const rep = await buildReport(biz.ctx, "dibatalkan", f);
    expect(rep.sections[0]!.rows[0]).toMatchObject({ alasan: "Pelanggan pergi", total: 11000 });
    expect(rep.sections[0]!.rows[0]!.dibatalkanOleh).toBeTruthy();
    expect(rep.sections[1]!.rows[0]).toMatchObject({ alasan: "Salah input", amount: 5500 });
    expect(rep.sections[2]!.rows[0]).toMatchObject({ alasan: "Porsi kurang", amount: 3000, metode: "QRIS" });
  });

  it("laporan hanya untuk yang berizin, rentang tanggal divalidasi, dan CSV menetralkan rumus", async () => {
    const { biz } = await scenario();
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(buildReport(cashier, "penjualan", f), "forbidden");
    expect(() => parseFilter({ dari: "2020-01-01", sampai: today }, today)).toThrow();
    expect(() => parseFilter({ dari: today, sampai: "2020-01-01" }, today)).toThrow();
    const csv = reportCsv({ summary: [], sections: [{ title: "T", columns: [{ key: "a", label: "A", kind: "text" }], rows: [{ a: "=CMD()" }] }] });
    expect(csv).toContain("'=CMD()");
  });

  it("bisnis lain tidak melihat data kita", async () => {
    await scenario();
    const other = await businessOf(`Kafe Lain ${Math.random()}`);
    const rep = await buildReport(other.ctx, "penjualan", f);
    expect(rep.sections[0]!.rows).toHaveLength(0);
  });
});

describe("beranda", () => {
  it("angka ringkasan cocok dengan skenario", async () => {
    const { overview } = await import("@/server/overview");
    const { biz } = await scenario();
    const ov = await overview(biz.ctx, today);
    expect(ov.orders).toBe(3);
    expect(ov.salesToday).toBe(69300 + 33000 - 3000);
    expect(ov.salesYesterday).toBe(0);
    expect(ov.shift).toBeNull();
    expect(ov.byType.reduce((s, t) => s + t.orders, 0)).toBe(3);
    expect(ov.grossProfit).toBe(39000 + 18000 + 5000);
  });
});
