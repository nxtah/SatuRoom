import { describe, expect, it } from "vitest";
import { createOrder, updateOrderStatus } from "@/server/orders";
import { payOrder, voidPayment } from "@/server/payments";
import { dailyReport, salesSeries, todayJakarta } from "@/server/reports";
import { createIngredient, setRecipe } from "@/server/stock";
import { businessOf, menuItemOf, staffOf } from "./helpers";

describe("laporan harian", () => {
  it("merangkum penjualan, metode bayar, menu terlaris, food cost, dan pembatalan", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const mie = await menuItemOf(biz.ctx, "Mie", 10000);
    const { id: bahan } = await createIngredient(biz.ctx, { name: "Mie mentah", unit: "kg", openingStock: 10, minimumStock: 1, averageCost: 20000 });
    await setRecipe(biz.ctx, { menuItemId: mie, lines: [{ ingredientId: bahan, quantity: 0.1 }] });

    const sell = async (qty: number) => {
      const { id } = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: mie, quantity: qty }] });
      await updateOrderStatus(biz.ctx, id, "preparing");
      await updateOrderStatus(biz.ctx, id, "ready");
      return id;
    };
    const a = await sell(3); // 30000, bahan 0.3 kg = 6000
    await payOrder(biz.ctx, { orderId: a, amount: 30000, method: "cash" });
    const b = await sell(2); // 20000, bahan 0.2 kg = 4000
    const pay = await payOrder(biz.ctx, { orderId: b, amount: 20000, method: "qris" });
    await voidPayment(biz.ctx, pay.id, { reason: "Salah input" });
    const { id: c } = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: mie, quantity: 1 }] });
    await updateOrderStatus(biz.ctx, c, "cancelled"); // stok kembali, food cost netral

    const r = await dailyReport(biz.ctx, todayJakarta());
    expect(r.sales).toBe(30000);
    expect(r.byMethod).toEqual([{ method: "cash", amount: 30000 }]);
    expect(r.orders).toMatchObject({ total: 3, cancelled: 1, voidedPayments: 1, voidedAmount: 20000 });
    expect(r.topItems[0]).toMatchObject({ name: "Mie", quantity: 5, revenue: 50000 });
    expect(r.foodCost).toBe(10000);
    expect(r.lowStock).toHaveLength(0);
  });

  it("tren 7 hari memuat hari ini, melewatkan pembayaran batal, dan hanya menghitung jam yang ada pesanannya", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const mie = await menuItemOf(biz.ctx, "Mie", 10000);
    const { id } = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: mie, quantity: 2 }] });
    await updateOrderStatus(biz.ctx, id, "preparing");
    await updateOrderStatus(biz.ctx, id, "ready");
    await payOrder(biz.ctx, { orderId: id, amount: 20000, method: "cash" });
    const today = todayJakarta();
    const s = await salesSeries(biz.ctx, today);
    expect(s.days).toHaveLength(7);
    expect(s.days.at(-1)).toEqual({ date: today, sales: 20000 });
    expect(s.days.slice(0, 6).every((d) => d.sales === 0)).toBe(true);
    expect(s.hours.reduce((a, h) => a + h.orders, 0)).toBe(1);
    await expect(salesSeries(biz.ctx, "bukan-tanggal")).rejects.toThrow("INVALID_DATE");
  });

  it("laporan hari lain kosong dan tanggal buruk ditolak", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const r = await dailyReport(biz.ctx, "2020-01-01");
    expect(r).toMatchObject({ sales: 0, foodCost: 0, topItems: [] });
    await expect(dailyReport(biz.ctx, "kemarin")).rejects.toThrow("INVALID_DATE");
  });

  it("hanya owner, manajer, akuntan; dan tidak bocor antar-bisnis", async () => {
    const a = await businessOf(`Kafe A ${Math.random()}`);
    const b = await businessOf(`Kafe B ${Math.random()}`);
    const mie = await menuItemOf(a.ctx, "Mie", 10000);
    const { id } = await createOrder(a.ctx, { type: "takeaway", lines: [{ menuItemId: mie, quantity: 1 }] });
    await updateOrderStatus(a.ctx, id, "preparing");
    await updateOrderStatus(a.ctx, id, "ready");
    await payOrder(a.ctx, { orderId: id, amount: 10000, method: "cash" });
    const cashier = await staffOf(a, ["cashier"]);
    await expect(dailyReport(cashier, todayJakarta())).rejects.toThrow("FORBIDDEN");
    expect((await dailyReport(a.ctx, todayJakarta())).sales).toBe(10000);
    expect((await dailyReport(b.ctx, todayJakarta())).sales).toBe(0);
  });
});
