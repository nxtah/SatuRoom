import { describe, expect, it } from "vitest";
import { accountOptions, trialBalance } from "@/server/accounting";
import {
  createAsset,
  createPurchase,
  createSupplier,
  issueStock,
  listAssets,
  listItems,
  payOrder,
  payPurchase,
  placeOrder,
  receivePurchase,
  runDepreciation,
  saveItem,
  setOrderStatus,
  stockCount,
} from "@/server/inventory";
import { approveRun, getRun, listPayProfiles, mySlips, payRun, prepareRun, setPayProfile, unapproveRun, adjustSlip } from "@/server/payroll";
import { acceptPlayerInvitation, invitePlayerAccount, myPlayerInvitations } from "@/server/player-account";
import { createPlayer } from "@/server/players";
import { createTeam } from "@/server/teams";
import { parentCancel, parentOrder, parentStore } from "@/server/store-parent";
import { setModule } from "@/server/modules";
import { academyOf, staffOf, userWithSession } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const month = () => today().slice(0, 7);
const zero = { baseSalary: 0, perSession: 0, allowance: 0, overtimePerHour: 0, lateDeduction: 0, unpaidLeaveDeduction: 0 };

async function balanced(ctx: Parameters<typeof trialBalance>[0]) {
  const tb = await trialBalance(ctx, today());
  expect(tb.totalDebit).toBe(tb.totalCredit);
  return tb;
}

describe("gaji", () => {
  it("hitung, sesuaikan, setujui, batal, bayar; slip terlihat staf", async () => {
    const a = await academyOf("Gaji FC");
    const coach = await staffOf(a, ["coach"], "Pelatih Gaji");
    await expect(prepareRun(a.ctx, month())).rejects.toMatchObject({ status: 422 });
    await expect(listPayProfiles(coach)).rejects.toMatchObject({ status: 403 });

    const people = await listPayProfiles(a.ctx);
    const c = people.find((p) => p.name === "Pelatih Gaji")!;
    await setPayProfile(a.ctx, c.membershipId, { ...zero, baseSalary: 2_000_000, allowance: 300_000 });
    const runId = await prepareRun(a.ctx, month());
    let run = (await getRun(a.ctx, month()))!;
    expect(run.total).toBe(2_300_000);
    await adjustSlip(a.ctx, run.slips[0]!.id, { label: "Bonus juara", amount: 200_000, kind: "earning" });
    run = (await getRun(a.ctx, month()))!;
    expect(run.total).toBe(2_500_000);
    expect(await mySlips(coach)).toHaveLength(0);

    await approveRun(a.ctx, runId);
    await expect(prepareRun(a.ctx, month())).rejects.toMatchObject({ status: 409 });
    await unapproveRun(a.ctx, runId);
    await approveRun(a.ctx, runId);
    await payRun(a.ctx, runId, today());
    const slips = await mySlips(coach);
    expect(slips).toHaveLength(1);
    expect(slips[0]).toMatchObject({ net: 2_500_000, status: "paid" });
    const tb = await balanced(a.ctx);
    expect(tb.rows.find((r) => r.name === "Utang gaji")).toBeUndefined();
  });
});

describe("stok, pembelian, toko, aset", () => {
  it("rata-rata tertimbang, HPP, opname, utang supplier, penyusutan", async () => {
    const a = await academyOf("Stok FC");
    const jersey = await saveItem(a.ctx, null, { name: "Jersey", unit: "pcs", minQty: 2, forSale: true, salePrice: 150_000 });
    await expect(saveItem(a.ctx, null, { name: "jersey", unit: "pcs", minQty: 0, forSale: false })).rejects.toMatchObject({ status: 409 });
    const sup = await createSupplier(a.ctx, { name: "Konveksi Jaya" });

    const po1 = await createPurchase(a.ctx, { supplierId: sup, orderedOn: today(), lines: [{ itemId: jersey, qty: 10, unitCost: 60_000 }] });
    await receivePurchase(a.ctx, po1, today());
    const po2 = await createPurchase(a.ctx, { supplierId: sup, orderedOn: today(), lines: [{ itemId: jersey, qty: 10, unitCost: 80_000 }] });
    await receivePurchase(a.ctx, po2, today());
    let item = (await listItems(a.ctx)).find((i) => i.id === jersey)!;
    expect(item).toMatchObject({ qty: 20, avgCost: 70_000 });
    await payPurchase(a.ctx, po1, today());
    await expect(payPurchase(a.ctx, po1, today())).rejects.toMatchObject({ status: 409 });

    const order = await placeOrder(a.ctx, { buyerName: "Ibu Andi", lines: [{ itemId: jersey, qty: 2 }] });
    await expect(setOrderStatus(a.ctx, order, "fulfilled")).rejects.toMatchObject({ status: 409 });
    await payOrder(a.ctx, order, "cash", today());
    await setOrderStatus(a.ctx, order, "fulfilled");
    await expect(placeOrder(a.ctx, { buyerName: "Ibu Bayu", lines: [{ itemId: jersey, qty: 99 }] })).rejects.toMatchObject({ status: 409 });

    await issueStock(a.ctx, { itemId: jersey, qty: 1, note: "Hadiah turnamen" });
    await stockCount(a.ctx, { counts: [{ itemId: jersey, qty: 15 }] });
    item = (await listItems(a.ctx)).find((i) => i.id === jersey)!;
    expect(item.qty).toBe(15);

    await createAsset(a.ctx, { name: "Gawang portabel", acquiredOn: today(), cost: 1_200_000, salvage: 0, usefulMonths: 12 });
    expect(await runDepreciation(a.ctx, month())).toBe(100_000);
    await expect(runDepreciation(a.ctx, month())).rejects.toMatchObject({ status: 409 });
    expect((await listAssets(a.ctx)).assets[0]).toMatchObject({ bookValue: 1_100_000 });

    const tb = await balanced(a.ctx);
    const row = (n: string) => tb.rows.find((r) => r.name === n);
    expect(row("Persediaan barang")?.debit).toBe(15 * 70_000);
    expect(row("Harga pokok penjualan")?.debit).toBe(140_000);
    expect(row("Utang usaha")?.credit).toBe(800_000 + 1_200_000);
    expect((await accountOptions(a.ctx)).length).toBeGreaterThan(5);
  });

  it("pelatih tidak bisa kelola stok", async () => {
    const a = await academyOf("Stok Aman");
    const coach = await staffOf(a, ["coach"]);
    await expect(createSupplier(coach, { name: "X Sport" })).rejects.toMatchObject({ status: 403 });
  });

  it("orang tua memesan dari portal; pesanan hanya miliknya", async () => {
    const a = await academyOf("Toko Ortu");
    const ball = await saveItem(a.ctx, null, { name: "Bola", unit: "pcs", minQty: 0, forSale: true, salePrice: 100_000 });
    await stockCount(a.ctx, { counts: [{ itemId: ball, qty: 3 }] });
    const team = await createTeam(a.ctx, { name: "U-12", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2014-01-01", teamIds: [team] });
    const user = await userWithSession("Ortu Raka");
    await invitePlayerAccount(a.ctx, pid, user.email);
    const [inv] = await myPlayerInvitations(user.userId);
    await acceptPlayerInvitation(user, inv!.id, "Ibu Raka");

    const id = await parentOrder(user, [{ itemId: ball, qty: 2 }]);
    await expect(parentOrder(user, [{ itemId: ball, qty: 9 }])).rejects.toMatchObject({ status: 409 });
    expect((await parentStore(user))!.orders).toHaveLength(1);
    await payOrder(a.ctx, id, "transfer", today());
    await expect(parentCancel(user, id)).rejects.toMatchObject({ status: 409 });

    await setModule(a.ctx, "store", false);
    expect(await parentStore(user)).toBeNull();
  });
});
