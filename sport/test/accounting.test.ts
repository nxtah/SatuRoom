import { sql } from "drizzle-orm";
import { withContext } from "@saturoom/core/db";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  accountOptions,
  balanceSheet,
  cashFlow,
  createAccount,
  createExpense,
  createManualJournal,
  createScholarship,
  generalLedger,
  profitLoss,
  receivablesAging,
  reconcile,
  reverseManualJournal,
  setLock,
  trialBalance,
  voidExpense,
} from "@/server/accounting";
import { generateInvoices, monthSummary, setTeamFee, updateInvoice } from "@/server/fees";
import { createPlayer } from "@/server/players";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const month = () => today().slice(0, 7);
const lastMonth = () => {
  const d = new Date(`${month()}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7);
};

async function setup(name: string) {
  const a = await academyOf(name);
  const t = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
  const andi = await createPlayer(a.ctx, { fullName: "Andi", birthDate: "2014-01-01", teamIds: [t] });
  const bayu = await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2014-01-01", teamIds: [t] });
  await setTeamFee(a.ctx, t, 200_000);
  const accts = await accountOptions(a.ctx);
  const byName = (n: string) => accts.find((x) => x.name === n)!.id;
  return { a, t, andi, bayu, byName };
}

describe("pembukuan otomatis dari iuran", () => {
  it("beasiswa, bayar sebagian, lunas, batal; laporan seimbang", async () => {
    const { a, andi, bayu, byName } = await setup("Garuda Buku");
    await createScholarship(a.ctx, { playerId: bayu, kind: "percent", value: 50, reason: "Prestasi", startsOn: `${month()}-01` });
    expect(await generateInvoices(a.ctx, month())).toBe(2);
    let s = await monthSummary(a.ctx, month());
    const ia = s.invoices.find((i) => i.playerId === andi)!;
    const ib = s.invoices.find((i) => i.playerId === bayu)!;
    expect(ib).toMatchObject({ amount: 200_000, discount: 100_000, net: 100_000 });
    expect(s.billed).toBe(300_000);

    await updateInvoice(a.ctx, ia.id, { action: "pay", amount: 50_000, method: "cash" });
    s = await monthSummary(a.ctx, month());
    expect(s.invoices.find((i) => i.id === ia.id)).toMatchObject({ status: "unpaid", paid: 50_000, remaining: 150_000 });
    await expect(updateInvoice(a.ctx, ia.id, { action: "pay", amount: 999_999 })).rejects.toMatchObject({ status: 422 });
    await updateInvoice(a.ctx, ia.id, { action: "pay", method: "transfer" });
    s = await monthSummary(a.ctx, month());
    expect(s).toMatchObject({ collected: 200_000, outstanding: 100_000 });
    await expect(updateInvoice(a.ctx, ia.id, { action: "waive" })).rejects.toMatchObject({ status: 409 });

    await updateInvoice(a.ctx, ib.id, { action: "discount", discount: 150_000, note: "Kakak beradik" });
    s = await monthSummary(a.ctx, month());
    expect(s.invoices.find((i) => i.id === ib.id)).toMatchObject({ net: 50_000 });

    const tb = await trialBalance(a.ctx, today());
    expect(tb.totalDebit).toBe(tb.totalCredit);
    const bs = await balanceSheet(a.ctx, today());
    expect(bs.balanced).toBe(true);
    const pl = await profitLoss(a.ctx, `${month()}-01`, today());
    expect(pl.totalIncome).toBe(250_000);
    const bank = await generalLedger(a.ctx, byName("Bank"), `${month()}-01`, today());
    expect(bank.entries.at(-1)!.balance).toBe(150_000);
    const aging = await receivablesAging(a.ctx, today());
    expect(aging.total).toBe(50_000);

    await updateInvoice(a.ctx, ia.id, { action: "unpay" });
    expect((await balanceSheet(a.ctx, today())).assets.find((x) => x.name === "Kas")).toBeUndefined();
    expect((await trialBalance(a.ctx, today())).totalDebit).toBe((await trialBalance(a.ctx, today())).totalCredit);
  });
});

describe("pengeluaran, jurnal manual, tutup buku", () => {
  it("jurnal tidak bisa diubah, dibalik saja; bulan tertutup menolak catatan", async () => {
    const { a, byName } = await setup("Garuda Biaya");
    const cash = byName("Kas");
    await createManualJournal(a.ctx, { date: today(), memo: "Setoran modal", lines: [{ accountId: cash, debit: 1_000_000, credit: 0 }, { accountId: byName("Modal pemilik"), debit: 0, credit: 1_000_000 }] });
    await expect(createManualJournal(a.ctx, { date: today(), memo: "Salah", lines: [{ accountId: cash, debit: 10, credit: 0 }, { accountId: byName("Modal pemilik"), debit: 0, credit: 9 }] })).rejects.toMatchObject({ status: 422 });
    const exp = await createExpense(a.ctx, { spentOn: today(), accountId: byName("Sewa lapangan"), paidFrom: cash, amount: 300_000, note: "Sewa Oktober" });
    let pl = await profitLoss(a.ctx, `${month()}-01`, today());
    expect(pl.totalExpense).toBe(300_000);
    await voidExpense(a.ctx, exp);
    pl = await profitLoss(a.ctx, `${month()}-01`, today());
    expect(pl.totalExpense).toBe(0);

    // Langsung ke database pun jurnal tidak bisa diubah/dihapus.
    await expect(
      withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) => tx.execute(sql`UPDATE bola.journal_lines SET debit = 1 WHERE debit > 0`)),
    ).rejects.toThrow();
    await expect(
      withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) => tx.execute(sql`DELETE FROM bola.journals`)),
    ).rejects.toThrow();

    const cf = await cashFlow(a.ctx, `${month()}-01`, today());
    expect(cf.closing).toBe(1_000_000);
    const led = await generalLedger(a.ctx, cash, `${month()}-01`, today());
    const rec = await reconcile(a.ctx, { accountId: cash, statementDate: today(), statementBalance: 1_000_000, lineIds: led.entries.map((e) => e.lineId) });
    expect(rec.difference).toBe(0);

    await setLock(a.ctx, lastMonth(), true);
    await expect(createExpense(a.ctx, { spentOn: `${lastMonth()}-15`, accountId: byName("Sewa lapangan"), paidFrom: cash, amount: 1, note: "Telat" })).rejects.toMatchObject({ status: 409, code: "period_locked" });
    await expect(setLock(a.ctx, month(), true)).rejects.toMatchObject({ status: 422 });

    const treasurer = await staffOf(a, ["treasurer"], "Bendahara");
    await expect(setLock(treasurer, lastMonth(), false)).rejects.toMatchObject({ status: 403 });
    await createAccount(treasurer, { code: "6-450", name: "Konsumsi", type: "expense", isCash: false });
    await expect(createAccount(treasurer, { code: "6-450", name: "Lagi", type: "expense", isCash: false })).rejects.toMatchObject({ status: 409 });
    const coach = await staffOf(a, ["coach"], "Pelatih");
    await expect(trialBalance(coach, today())).rejects.toMatchObject({ status: 403 });
  });

  it("jurnal otomatis tidak bisa dibalik dari menu jurnal; akademi lain terisolasi", async () => {
    const { a, byName } = await setup("Garuda Iso Buku");
    const b = await academyOf("Elang Iso Buku");
    const exp = await createExpense(a.ctx, { spentOn: today(), accountId: byName("Sewa lapangan"), paidFrom: byName("Kas"), amount: 5_000, note: "Air" });
    const [j] = (await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.execute(sql`SELECT id FROM bola.journals WHERE source_id = ${exp}::uuid`),
    )) as unknown as { id: string }[];
    await expect(reverseManualJournal(a.ctx, j!.id)).rejects.toMatchObject({ status: 409 });
    await expect(reverseManualJournal(b.ctx, j!.id)).rejects.toMatchObject({ status: 404 });
    expect((await trialBalance(b.ctx, today())).rows).toEqual([]);
    await expect(createExpense(b.ctx, { spentOn: today(), accountId: byName("Sewa lapangan"), paidFrom: byName("Kas"), amount: 1, note: "Curang" })).rejects.toMatchObject({ status: 422 });
  });
});
