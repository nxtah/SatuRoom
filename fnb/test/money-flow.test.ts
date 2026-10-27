import { describe, expect, it } from "vitest";
import { createOrder, listOrders, updateOrderStatus } from "@/server/orders";
import { closeShift, currentShiftSummary, openShift, payOrder, voidPayment } from "@/server/payments";
import { businessOf, menuItemOf, staffOf } from "./helpers";

async function readyOrder(biz: Awaited<ReturnType<typeof businessOf>>, itemId: string, quantity = 2) {
  const { id } = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity }] });
  await updateOrderStatus(biz.ctx, id, "preparing");
  await updateOrderStatus(biz.ctx, id, "ready");
  return id;
}
const statusOf = async (biz: Awaited<ReturnType<typeof businessOf>>, id: string) =>
  (await listOrders(biz.ctx, "all")).find((o) => o.id === id)!.status;

describe("pesanan dan pembayaran", () => {
  it("menghitung total dari harga menu dan menolak lompat status", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 15000);
    const { id } = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 3 }] });
    expect((await listOrders(biz.ctx)).find((o) => o.id === id)!.total).toBe(45000);
    await expect(updateOrderStatus(biz.ctx, id, "completed")).rejects.toThrow("INVALID_TRANSITION");
  });

  it("menolak menu yang ditandai habis", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const item = await menuItemOf(biz.ctx);
    const { setItemAvailability } = await import("@/server/catalog");
    await setItemAvailability(biz.ctx, item, false);
    await expect(createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] })).rejects.toThrow("ITEM_UNAVAILABLE");
  });

  it("pembayaran cicilan: selesai hanya saat lunas, void membuka lagi", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const id = await readyOrder(biz, item, 3); // total 30000
    const first = await payOrder(biz.ctx, { orderId: id, amount: 10000, method: "cash" });
    expect(first).toMatchObject({ remaining: 20000, completed: false });
    const second = await payOrder(biz.ctx, { orderId: id, amount: 20000, method: "qris" });
    expect(second).toMatchObject({ remaining: 0, completed: true });
    expect(await statusOf(biz, id)).toBe("completed");
    await voidPayment(biz.ctx, second.id, { reason: "Salah input" });
    expect(await statusOf(biz, id)).toBe("served");
  });

  it("menolak bayar pesanan yang belum siap", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const item = await menuItemOf(biz.ctx);
    const { id } = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    await expect(payOrder(biz.ctx, { orderId: id, amount: 1000, method: "cash" })).rejects.toThrow("ORDER_NOT_READY");
  });

  it("izin: kasir tidak boleh void, dapur tidak boleh bayar atau buka kas", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const id = await readyOrder(biz, item, 1);
    const cashier = await staffOf(biz, ["cashier"]);
    const kitchen = await staffOf(biz, ["kitchen"]);
    const paid = await payOrder(cashier, { orderId: id, amount: 10000, method: "cash" });
    await expect(voidPayment(cashier, paid.id, { reason: "Coba void" })).rejects.toThrow("FORBIDDEN");
    await expect(payOrder(kitchen, { orderId: id, amount: 1000, method: "cash" })).rejects.toThrow("FORBIDDEN");
    await expect(openShift(kitchen, { openingCash: 0 })).rejects.toThrow("FORBIDDEN");
  });

  it("isolasi: bisnis lain tidak bisa membayar atau mengubah pesanan", async () => {
    const a = await businessOf(`Kafe A ${Math.random()}`);
    const b = await businessOf(`Kafe B ${Math.random()}`);
    const id = await readyOrder(a, await menuItemOf(a.ctx), 1);
    await expect(payOrder(b.ctx, { orderId: id, amount: 1000, method: "cash" })).rejects.toThrow("NOT_FOUND");
    await expect(updateOrderStatus(b.ctx, id, "cancelled")).rejects.toThrow("NOT_FOUND");
    expect(await listOrders(b.ctx, "all")).toHaveLength(0);
  });
});

describe("shift kas", () => {
  it("menghitung kas seharusnya dari kas awal ditambah tunai, dan hanya satu shift terbuka", async () => {
    const biz = await businessOf(`Kafe ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    await openShift(biz.ctx, { openingCash: 100000 });
    await expect(openShift(biz.ctx, { openingCash: 0 })).rejects.toThrow("SHIFT_OPEN");
    const id = await readyOrder(biz, item, 2);
    await payOrder(biz.ctx, { orderId: id, amount: 15000, method: "cash" });
    await payOrder(biz.ctx, { orderId: id, amount: 5000, method: "qris" });
    const summary = await currentShiftSummary(biz.ctx);
    expect(summary).toMatchObject({ salesTotal: 20000, cashTotal: 15000, nonCashTotal: 5000, expectedCash: 115000 });
    expect(await closeShift(biz.ctx, { closingCash: 115000 })).toMatchObject({ expectedCash: 115000 });
    expect((await currentShiftSummary(biz.ctx)).shift).toBeNull();
  });
});
