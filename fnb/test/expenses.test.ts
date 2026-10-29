import { describe, expect, it } from "vitest";
import { createExpense, listExpenses, voidExpense } from "@/server/expenses";
import { closeShift, currentShiftSummary, openShift } from "@/server/payments";
import { dailyReport, todayJakarta } from "@/server/reports";
import { businessOf, staffOf } from "./helpers";

const rejects = (p: Promise<unknown>, code: string) => expect(p).rejects.toSatisfy((e: unknown) => (e as { code?: string }).code === code);

describe("pengeluaran", () => {
  it("izin, laporan, dan pembatalan dengan alasan", async () => {
    const biz = await businessOf(`Kafe Biaya ${Math.random()}`);
    const cashier = await staffOf(biz, ["cashier"]);
    const manager = await staffOf(biz, ["manager"]);
    await rejects(createExpense(cashier, { amount: 1000, category: "Listrik", fromDrawer: false }), "forbidden");
    const e = await createExpense(manager, { amount: 250000, category: "Listrik", note: "Token", fromDrawer: false });
    expect((await dailyReport(biz.ctx, todayJakarta())).expenses).toBe(250000);
    await voidExpense(biz.ctx, e.id, { reason: "Salah input" });
    await rejects(voidExpense(biz.ctx, e.id, { reason: "Lagi" }), "already_voided");
    expect((await dailyReport(biz.ctx, todayJakarta())).expenses).toBe(0);
    expect((await listExpenses(biz.ctx))[0]).toMatchObject({ voidReason: "Salah input" });
  });

  it("dibayar dari laci mengurangi kas seharusnya, dan pembatalannya mengembalikan", async () => {
    const biz = await businessOf(`Kafe Laci Biaya ${Math.random()}`);
    await rejects(createExpense(biz.ctx, { amount: 5000, category: "Es batu", fromDrawer: true }), "shift_required");
    await openShift(biz.ctx, { openingCash: 100000 });
    const e = await createExpense(biz.ctx, { amount: 30000, category: "Gas", fromDrawer: true });
    expect((await currentShiftSummary(biz.ctx)).expectedCash).toBe(70000);
    await voidExpense(biz.ctx, e.id, { reason: "Batal beli" });
    expect((await currentShiftSummary(biz.ctx)).expectedCash).toBe(100000);
    await closeShift(biz.ctx, { closingCash: 100000 });
  });

  it("bisnis lain tidak melihat pengeluaran", async () => {
    const a = await businessOf(`Kafe A Biaya ${Math.random()}`), b = await businessOf(`Kafe B Biaya ${Math.random()}`);
    await createExpense(a.ctx, { amount: 1000, category: "Lain", fromDrawer: false });
    expect(await listExpenses(b.ctx)).toHaveLength(0);
  });
});
