import { describe, expect, it } from "vitest";
import { createOrder, updateOrderStatus } from "@/server/orders";
import { openShift, payOrder, refundPayment } from "@/server/payments";
import { todayJakarta } from "@/server/reports";
import { getTransaction, listTransactions, parseTxFilter } from "@/server/transactions";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const today = todayJakarta();
const filter = (extra: Record<string, string> = {}) => parseTxFilter({ dari: today, sampai: today, ...extra }, today);
const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

describe("riwayat transaksi", () => {
  it("menyaring per status bayar, metode, dan kata kunci, lalu menampilkan detail lengkap", async () => {
    const biz = await businessOf(`Kafe Riwayat ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Nasi", 20000);
    await openShift(biz.ctx, { openingCash: 0 });
    const paid = await createOrder(biz.ctx, { type: "takeaway", customerName: "Budi", lines: [{ menuItemId: item, quantity: 1 }] });
    await updateOrderStatus(biz.ctx, paid.id, "preparing"); await updateOrderStatus(biz.ctx, paid.id, "ready");
    const p = await payOrder(biz.ctx, { orderId: paid.id, amount: 20000, method: "qris" });
    await createOrder(biz.ctx, { type: "takeaway", customerName: "Sari", lines: [{ menuItemId: item, quantity: 2 }] });
    const gone = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: 1 }] });
    await updateOrderStatus(biz.ctx, gone.id, "cancelled", "Batal tes");

    expect((await listTransactions(biz.ctx, filter())).total).toBe(3);
    expect((await listTransactions(biz.ctx, filter({ bayar: "lunas" }))).rows.map((r) => r.id)).toEqual([paid.id]);
    expect((await listTransactions(biz.ctx, filter({ bayar: "belum" }))).total).toBe(1);
    expect((await listTransactions(biz.ctx, filter({ bayar: "batal" }))).rows[0]!.id).toBe(gone.id);
    expect((await listTransactions(biz.ctx, filter({ metode: "qris" }))).total).toBe(1);
    expect((await listTransactions(biz.ctx, filter({ cari: "sari" }))).total).toBe(1);
    expect((await listTransactions(biz.ctx, filter({ cari: "%" }))).total).toBe(0);

    await refundPayment(biz.ctx, p.id, { amount: 20000, reason: "Salah pesan" });
    expect((await listTransactions(biz.ctx, filter({ bayar: "refund" }))).total).toBe(1);
    const d = await getTransaction(biz.ctx, paid.id);
    expect(d).toMatchObject({ receiptNo: paid.receiptNo, total: 20000, customerName: "Budi", state: "refund" });
    expect(d.lines[0]).toMatchObject({ name: "Nasi", qty: 1 });
    expect(d.refunds[0]).toMatchObject({ reason: "Salah pesan" });
    expect(d.timeline.map((t) => t.label).join("|")).toContain("Refund");
  });

  it("tidak membocorkan transaksi bisnis lain dan menolak peran tanpa izin", async () => {
    const a = await businessOf(`Kafe A ${Math.random()}`);
    const b = await businessOf(`Kafe B ${Math.random()}`);
    const o = await createOrder(a.ctx, { type: "takeaway", lines: [{ menuItemId: await menuItemOf(a.ctx), quantity: 1 }] });
    expect((await listTransactions(b.ctx, filter())).total).toBe(0);
    await rejects(getTransaction(b.ctx, o.id), "not_found");
    const kitchen = await staffOf(a, ["kitchen"]);
    await rejects(listTransactions(kitchen, filter()), "forbidden");
  });
});
