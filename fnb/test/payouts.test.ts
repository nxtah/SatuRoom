import { describe, expect, it } from "vitest";
import { createOrder, updateOrderStatus } from "@/server/orders";
import { openShift, payOrder, refundPayment } from "@/server/payments";
import { archivePayoutAccount, cancelPayout, markPayoutPaid, payoutOverview, requestPayout, savePayoutAccount } from "@/server/payouts";
import { businessOf, menuItemOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code || (e as Error).message === code);

async function sale(biz: Awaited<ReturnType<typeof businessOf>>, item: string, method: "cash" | "qris", qty: number) {
  const o = await createOrder(biz.ctx, { type: "takeaway", lines: [{ menuItemId: item, quantity: qty }] });
  await updateOrderStatus(biz.ctx, o.id, "preparing"); await updateOrderStatus(biz.ctx, o.id, "ready");
  const pay = await payOrder(biz.ctx, { orderId: o.id, amount: o.total, method });
  return { id: pay.id, amount: o.total };
}

describe("payout", () => {
  it("saldo hanya dari non-tunai bersih refund, penarikan dikunci oleh saldo", async () => {
    const biz = await businessOf(`Kafe Payout ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Nasi", 50000);
    await openShift(biz.ctx, { openingCash: 0 });
    await sale(biz, item, "cash", 1);
    const q = await sale(biz, item, "qris", 2);
    await refundPayment(biz.ctx, q.id, { amount: 10000, reason: "Salah menu" });
    const net = (await payoutOverview(biz.ctx)).balance;
    expect(net.available).toBe(q.amount - 10000);

    const acc = await savePayoutAccount(biz.ctx, { bankName: "BCA", accountName: "Budi", accountNo: "1234567890" });
    await rejects(savePayoutAccount(biz.ctx, { bankName: "BCA", accountName: "Budi", accountNo: "1234567890" }), "duplicate");
    await rejects(requestPayout(biz.ctx, { accountId: acc.id, amount: net.available + 1 }), "insufficient_balance");
    const p = await requestPayout(biz.ctx, { accountId: acc.id, amount: 40000 });
    expect((await payoutOverview(biz.ctx)).balance.available).toBe(net.available - 40000);
    await rejects(archivePayoutAccount(biz.ctx, acc.id), "account_in_use");

    await markPayoutPaid(biz.ctx, p.id, { reference: "TRF-001", fee: 2500 });
    await rejects(cancelPayout(biz.ctx, p.id, { reason: "Terlambat" }), "not_pending");
    await rejects(markPayoutPaid(biz.ctx, p.id, { reference: "TRF-002", fee: 0 }), "not_pending");
    const after = await payoutOverview(biz.ctx);
    expect(after.balance.paidOut).toBe(40000);
    expect(after.payouts[0]).toMatchObject({ status: "dicairkan", reference: "TRF-001", fee: 2500, accountNo: "••••••7890" });

    const p2 = await requestPayout(biz.ctx, { accountId: acc.id, amount: 10000 });
    await cancelPayout(biz.ctx, p2.id, { reason: "Salah nominal" });
    expect((await payoutOverview(biz.ctx)).balance.pending).toBe(0);
  });

  it("dua pengajuan bersamaan tidak melewati saldo", async () => {
    const biz = await businessOf(`Kafe Race ${Math.random()}`);
    const item = await menuItemOf(biz.ctx, "Nasi", 50000);
    await openShift(biz.ctx, { openingCash: 0 });
    const q = await sale(biz, item, "qris", 1);
    const acc = await savePayoutAccount(biz.ctx, { bankName: "BRI", accountName: "Ani", accountNo: "99887766" });
    const results = await Promise.allSettled([requestPayout(biz.ctx, { accountId: acc.id, amount: q.amount }), requestPayout(biz.ctx, { accountId: acc.id, amount: q.amount })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  });

  it("izin dan isolasi bisnis", async () => {
    const a = await businessOf(`Kafe PA ${Math.random()}`);
    const b = await businessOf(`Kafe PB ${Math.random()}`);
    const acc = await savePayoutAccount(a.ctx, { bankName: "BCA", accountName: "Andi", accountNo: "11111111" });
    await rejects(requestPayout(b.ctx, { accountId: acc.id, amount: 10000 }), "invalid");
    await rejects(payoutOverview(await staffOf(a, ["cashier"])), "forbidden");
    expect((await payoutOverview(b.ctx)).accounts).toHaveLength(0);
  });
});
