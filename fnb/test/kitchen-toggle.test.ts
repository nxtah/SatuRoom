import { describe, expect, it } from "vitest";
import { createOrder, listOrders, updateOrderStatus } from "@/server/orders";
import { openShift, payOrder } from "@/server/payments";
import { getSettings, updateSettings } from "@/server/settings";
import { businessOf, menuItemOf } from "./helpers";

const base = { taxPercent: 0, servicePercent: 0, receiptPrefix: "RSA", receiptHeader: null, receiptFooter: null };

describe("alur pesanan tanpa dapur", () => {
  it("dapur aktif secara bawaan, dan pengaturan lain tidak mengubahnya", async () => {
    const biz = await businessOf(`Kafe Dapur ${Math.random()}`);
    expect((await getSettings(biz.ctx)).kitchenEnabled).toBe(true);
    const item = await menuItemOf(biz.ctx, "Nasi", 10000);
    const o = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    expect((await listOrders(biz.ctx)).find((x) => x.id === o.id)).toMatchObject({ status: "confirmed" });
    await updateSettings(biz.ctx, { ...base, taxPercent: 5 });
    expect((await getSettings(biz.ctx)).kitchenEnabled).toBe(true); // tidak dikirim = tidak berubah
  });

  it("dapur dimatikan: pesanan baru langsung disajikan, bisa dibayar dan bisa dibatalkan sebelum dibayar", async () => {
    const biz = await businessOf(`Kafe Cepat ${Math.random()}`);
    await updateSettings(biz.ctx, { ...base, kitchenEnabled: false });
    expect((await getSettings(biz.ctx)).kitchenEnabled).toBe(false);
    const item = await menuItemOf(biz.ctx, "Es teh", 8000);
    const a = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 2 }] });
    const order = (await listOrders(biz.ctx, "all")).find((x) => x.id === a.id)!;
    expect(order.status).toBe("served");
    expect(order.lines.every((l) => l.status === "ready")).toBe(true);
    await openShift(biz.ctx, { openingCash: 0 });
    const paid = await payOrder(biz.ctx, { orderId: a.id, amount: 16000, method: "cash" });
    expect(paid.completed).toBe(true);

    const b = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    await updateOrderStatus(biz.ctx, b.id, "cancelled", "salah catat");
    expect((await listOrders(biz.ctx, "all")).find((x) => x.id === b.id)!.status).toBe("cancelled");
    // Sudah dibayar: tetap tidak bisa dibatalkan begitu saja.
    await expect(updateOrderStatus(biz.ctx, a.id, "cancelled", "coba batal")).rejects.toBeTruthy();

    await updateSettings(biz.ctx, { ...base, kitchenEnabled: true });
    const c = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    expect((await listOrders(biz.ctx)).find((x) => x.id === c.id)!.status).toBe("confirmed");
  });
});
