import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/pricing";
import { createOrder, listOrders, updateOrderStatus } from "@/server/orders";
import { addCashMovement, closeShift, currentShiftSummary, openShift, payOrder, refundPayment, voidPayment } from "@/server/payments";
import { dailyReport, todayJakarta } from "@/server/reports";
import { updateSettings } from "@/server/settings";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);
type Biz = Awaited<ReturnType<typeof businessOf>>;

async function ready(biz: Biz, itemId: string, quantity = 2, extra: Record<string, unknown> = {}) {
  const created = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: itemId, quantity }], ...extra });
  await updateOrderStatus(biz.ctx, created.id, "preparing");
  await updateOrderStatus(biz.ctx, created.id, "ready");
  return created;
}
const settings = (taxPercent: number, servicePercent: number) => ({ taxPercent, servicePercent, receiptPrefix: "RSA", receiptHeader: null, receiptFooter: null });

describe("hitungan total", () => {
  it("diskon dulu, lalu service charge, lalu pajak atas keduanya", () => {
    expect(computeTotals({ gross: 20000, servicePercent: 5, taxPercent: 11 })).toEqual({ gross: 20000, discount: 0, service: 1000, tax: 2310, total: 23310 });
    expect(computeTotals({ gross: 20000, discountType: "percent", discountValue: 10, servicePercent: 5, taxPercent: 11 })).toMatchObject({ discount: 2000, service: 900, tax: 2079, total: 20979 });
    expect(computeTotals({ gross: 20000, discountType: "amount", discountValue: 99999, servicePercent: 0, taxPercent: 11 })).toMatchObject({ discount: 20000, total: 0 });
  });
});

describe("pesanan: pajak, diskon, nomor struk, idempotensi", () => {
  it("memakai tarif pengaturan dan memberi nomor struk berurutan per bisnis", async () => {
    const biz = await businessOf(`Kafe Pajak ${Math.random()}`);
    await updateSettings(biz.ctx, settings(11, 5));
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const a = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 2 }] });
    const b = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    expect(a.total).toBe(23310);
    expect(a.receiptNo).toMatch(/^RSA-\d{6}-0001$/);
    expect(b.receiptNo).toMatch(/^RSA-\d{6}-0002$/);
    const order = (await listOrders(biz.ctx)).find((o) => o.id === a.id)!;
    expect(order).toMatchObject({ subtotal: 20000, serviceCharge: 1000, tax: 2310, total: 23310 });
    // Mengubah tarif sesudahnya tidak mengubah pesanan lama.
    await updateSettings(biz.ctx, settings(0, 0));
    expect((await listOrders(biz.ctx)).find((o) => o.id === a.id)!.total).toBe(23310);
    const other = await businessOf(`Kafe Lain ${Math.random()}`);
    const first = await createOrder(other.ctx, { type: "takeaway", lines: [{ menuItemId: await menuItemOf(other.ctx), quantity: 1 }] });
    expect(first.receiptNo).toMatch(/-0001$/);
  });

  it("diskon butuh izin dan alasan, dan tidak bisa melebihi subtotal", async () => {
    const biz = await businessOf(`Kafe Diskon ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const cashier = await staffOf(biz, ["cashier"]);
    const manager = await staffOf(biz, ["manager"]);
    const line = [{ menuItemId: item, quantity: 2 }];
    await rejects(createOrder(cashier, { type: "takeaway", lines: line, discountType: "percent", discountValue: 10, discountReason: "Teman" }), "forbidden");
    await rejects(createOrder(manager, { type: "takeaway", lines: line, discountType: "percent", discountValue: 10 }), "discount_reason");
    await rejects(createOrder(manager, { type: "takeaway", lines: line, discountType: "percent", discountValue: 150, discountReason: "Salah" }), "discount_invalid");
    const ok = await createOrder(manager, { type: "takeaway", lines: line, discountType: "percent", discountValue: 25, discountReason: "Pelanggan setia" });
    expect(ok.total).toBe(15000);
    const big = await createOrder(manager, { type: "takeaway", lines: line, discountType: "amount", discountValue: 999999, discountReason: "Promo" });
    expect(big.total).toBe(0);
  });

  it("kunci idempotensi membuat pesanan dan pembayaran tidak dobel", async () => {
    const biz = await businessOf(`Kafe Idem ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const key = "kunci-pesanan-123";
    const one = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }], idempotencyKey: key });
    const two = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }], idempotencyKey: key });
    expect(two.id).toBe(one.id);
    expect(await listOrders(biz.ctx, "all")).toHaveLength(1);
    await openShift(biz.ctx, { openingCash: 0 });
    await updateOrderStatus(biz.ctx, one.id, "preparing");
    await updateOrderStatus(biz.ctx, one.id, "ready");
    const p1 = await payOrder(biz.ctx, { orderId: one.id, amount: 4000, method: "cash", idempotencyKey: "kunci-bayar-1" });
    const p2 = await payOrder(biz.ctx, { orderId: one.id, amount: 4000, method: "cash", idempotencyKey: "kunci-bayar-1" });
    expect(p2.id).toBe(p1.id);
    expect(p2.paid).toBe(4000);
  });

  it("pembatalan butuh alasan dan ditolak untuk pesanan yang sudah dibayar", async () => {
    const biz = await businessOf(`Kafe Batal ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const o = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    await rejects(updateOrderStatus(biz.ctx, o.id, "cancelled"), "reason_required");
    await updateOrderStatus(biz.ctx, o.id, "cancelled", "Pelanggan pergi");
    expect((await listOrders(biz.ctx, "all"))[0]).toMatchObject({ status: "cancelled", cancelReason: "Pelanggan pergi" });
  });
});

describe("pembayaran dan kas", () => {
  it("butuh shift, menolak kelebihan bayar, dan menghitung kembalian tunai", async () => {
    const biz = await businessOf(`Kafe Bayar ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    const o = await ready(biz, item, 2); // 20000
    await rejects(payOrder(biz.ctx, { orderId: o.id, amount: 5000, method: "cash" }), "shift_required");
    await openShift(biz.ctx, { openingCash: 0 });
    await rejects(payOrder(biz.ctx, { orderId: o.id, amount: 25000, method: "cash" }), "overpay");
    await rejects(payOrder(biz.ctx, { orderId: o.id, amount: 5000, method: "qris", tendered: 10000 }), "tender_invalid");
    await rejects(payOrder(biz.ctx, { orderId: o.id, amount: 20000, method: "cash", tendered: 15000 }), "tender_short");
    const paid = await payOrder(biz.ctx, { orderId: o.id, amount: 20000, method: "cash", tendered: 50000 });
    expect(paid).toMatchObject({ completed: true, remaining: 0, change: 30000 });
    await rejects(payOrder(biz.ctx, { orderId: o.id, amount: 1000, method: "cash" }), "already_paid");
  });

  it("kas seharusnya = kas awal + tunai + kas masuk - kas keluar - refund tunai; QRIS tidak masuk laci", async () => {
    const biz = await businessOf(`Kafe Laci ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    await openShift(biz.ctx, { openingCash: 100000 });
    const a = await ready(biz, item, 2); // 20000 tunai
    const cash = await payOrder(biz.ctx, { orderId: a.id, amount: 20000, method: "cash" });
    const b = await ready(biz, item, 3); // 30000 qris
    const qris = await payOrder(biz.ctx, { orderId: b.id, amount: 30000, method: "qris" });
    await addCashMovement(biz.ctx, { kind: "in", amount: 5000, category: "Tambah modal", reason: "Tambah uang receh" });
    await addCashMovement(biz.ctx, { kind: "out", amount: 3000, category: "Operasional", reason: "Beli es batu" });
    await refundPayment(biz.ctx, cash.id, { amount: 4000, reason: "Pesanan kurang satu" });
    await refundPayment(biz.ctx, qris.id, { amount: 10000, reason: "Salah menu" });
    const s = await currentShiftSummary(biz.ctx);
    expect(s).toMatchObject({ cashIn: 5000, cashOut: 3000, cashRefunds: 4000, refundTotal: 14000, expectedCash: 100000 + 20000 + 5000 - 3000 - 4000, salesTotal: 36000 });
    const closed = await closeShift(biz.ctx, { closingCash: 117000 });
    expect(closed).toMatchObject({ expectedCash: 118000, variance: -1000 });
  });

  it("refund: izin, batas nominal, tidak bisa void sesudahnya, dan memotong laporan", async () => {
    const biz = await businessOf(`Kafe Refund ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Mie", 10000);
    await openShift(biz.ctx, { openingCash: 0 });
    const o = await ready(biz, item, 2);
    const pay = await payOrder(biz.ctx, { orderId: o.id, amount: 20000, method: "cash" });
    const cashier = await staffOf(biz, ["cashier"]);
    await rejects(refundPayment(cashier, pay.id, { amount: 1000, reason: "Coba" }), "forbidden");
    await rejects(refundPayment(biz.ctx, pay.id, { amount: 25000, reason: "Terlalu besar" }), "refund_exceeds");
    await refundPayment(biz.ctx, pay.id, { amount: 5000, reason: "Satu porsi dingin" });
    await rejects(voidPayment(biz.ctx, pay.id, { reason: "Salah input" }), "has_refunds");
    await rejects(refundPayment(biz.ctx, pay.id, { amount: 16000, reason: "Lebih" }), "refund_exceeds");
    const r = await dailyReport(biz.ctx, todayJakarta());
    expect(r).toMatchObject({ sales: 15000, refunds: { count: 1, amount: 5000 } });
    expect((await listOrders(biz.ctx, "all"))[0]).toMatchObject({ refunded: 5000, status: "completed" });
  });

  it("kas masuk/keluar butuh shift dan izin; bisnis lain tidak bisa refund", async () => {
    const a = await businessOf(`Kafe A Kas ${Math.random()}`);
    const b = await businessOf(`Kafe B Kas ${Math.random()}`);
    await rejects(addCashMovement(a.ctx, { kind: "out", amount: 1000, category: "Lain", reason: "Tanpa shift" }), "shift_required");
    await openShift(a.ctx, { openingCash: 0 });
    await openShift(b.ctx, { openingCash: 0 });
    const kitchen = await staffOf(a, ["kitchen"]);
    await rejects(addCashMovement(kitchen, { kind: "in", amount: 1000, category: "Lain", reason: "Dapur" }), "FORBIDDEN");
    const o = await ready(a, await menuItemOf(a.ctx, "Mie", 10000), 1);
    const pay = await payOrder(a.ctx, { orderId: o.id, amount: 10000, method: "cash" });
    await rejects(refundPayment(b.ctx, pay.id, { amount: 1000, reason: "Bukan milik B" }), "not_found");
  });
});
