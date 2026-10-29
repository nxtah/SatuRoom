import { describe, expect, it } from "vitest";
import { generateInvoices, listTeamFees, monthSummary, setTeamFee, updateInvoice } from "@/server/fees";
import { createPlayer, setPlayerStatus } from "@/server/players";
import { createTeam } from "@/server/teams";
import { listStaff } from "@/server/staff";
import { academyOf, staffOf } from "./helpers";

const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()).slice(0, 7);

async function setup() {
  const a = await academyOf("Garuda");
  const t1 = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
  const t2 = await createTeam(a.ctx, { name: "Skuad turnamen", ageMin: null, ageMax: null });
  const andi = await createPlayer(a.ctx, { fullName: "Andi", birthDate: "2014-01-01", teamIds: [t1, t2], guardianPhone: "0812 3456 7890" });
  const bayu = await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2014-01-01", teamIds: [t1] });
  return { a, t1, t2, andi, bayu };
}

describe("iuran", () => {
  it("tagihan dibuat dari tarif tim (tertinggi bila di dua tim), sekali per bulan", async () => {
    const { a, t1, t2, andi } = await setup();
    await setTeamFee(a.ctx, t1, 150_000);
    await setTeamFee(a.ctx, t2, 200_000);
    expect((await listTeamFees(a.ctx)).map((f) => [f.teamName, f.amount])).toEqual([
      ["KU 10-13", 150_000],
      ["Skuad turnamen", 200_000],
    ]);
    expect(await generateInvoices(a.ctx, thisMonth())).toBe(2);
    expect(await generateInvoices(a.ctx, thisMonth())).toBe(0);
    const s = await monthSummary(a.ctx, thisMonth());
    expect(s.invoices.map((i) => [i.fullName, i.amount])).toEqual([
      ["Andi", 200_000],
      ["Bayu", 150_000],
    ]);
    expect(s).toMatchObject({ billed: 350_000, collected: 0, outstanding: 350_000, unpaidCount: 2, missing: 0 });
    expect(s.invoices.find((i) => i.playerId === andi)!.guardianPhone).toBe("0812 3456 7890");
  });

  it("lunas, batal lunas, dibebaskan, dan ubah nominal tercermin di ringkasan", async () => {
    const { a, t1 } = await setup();
    await setTeamFee(a.ctx, t1, 100_000);
    await generateInvoices(a.ctx, thisMonth());
    const [andi, bayu] = (await monthSummary(a.ctx, thisMonth())).invoices;
    await updateInvoice(a.ctx, andi!.id, { action: "pay", method: "transfer" });
    await updateInvoice(a.ctx, bayu!.id, { action: "amount", amount: 50_000 });
    let s = await monthSummary(a.ctx, thisMonth());
    expect(s).toMatchObject({ billed: 150_000, collected: 100_000, outstanding: 50_000, unpaidCount: 1 });
    expect(s.invoices.find((i) => i.id === andi!.id)).toMatchObject({ status: "paid", method: "transfer" });
    await expect(updateInvoice(a.ctx, andi!.id, { action: "amount", amount: 1 })).rejects.toMatchObject({ status: 409 });
    await updateInvoice(a.ctx, bayu!.id, { action: "waive" });
    await updateInvoice(a.ctx, andi!.id, { action: "unpay" });
    s = await monthSummary(a.ctx, thisMonth());
    expect(s).toMatchObject({ billed: 100_000, collected: 0, outstanding: 100_000, unpaidCount: 1 });
  });

  it("pemain nonaktif tidak ditagih; bulan di luar jangkauan ditolak", async () => {
    const { a, t1, bayu } = await setup();
    await setTeamFee(a.ctx, t1, 100_000);
    await setPlayerStatus(a.ctx, bayu, "inactive");
    expect(await generateInvoices(a.ctx, thisMonth())).toBe(1);
    await expect(generateInvoices(a.ctx, "2020-01")).rejects.toMatchObject({ status: 422 });
  });

  it("bendahara mengelola iuran tanpa akses staf; pelatih dan kepala pelatih tidak bisa", async () => {
    const { a, t1 } = await setup();
    const treasurer = await staffOf(a, ["treasurer"], "Bu Ani");
    await setTeamFee(treasurer, t1, 120_000);
    expect(await generateInvoices(treasurer, thisMonth())).toBe(2);
    await expect(listStaff(treasurer)).rejects.toMatchObject({ status: 403 });
    const coach = await staffOf(a, ["coach"], "Tomi");
    const head = await staffOf(a, ["head_coach"], "Budi");
    await expect(monthSummary(coach, thisMonth())).rejects.toMatchObject({ status: 403 });
    await expect(setTeamFee(head, t1, 1)).rejects.toMatchObject({ status: 403 });
  });

  it("akademi lain tidak melihat atau mengubah iuran", async () => {
    const { a, t1 } = await setup();
    const b = await academyOf("Elang");
    await setTeamFee(a.ctx, t1, 100_000);
    await generateInvoices(a.ctx, thisMonth());
    const [inv] = (await monthSummary(a.ctx, thisMonth())).invoices;
    expect((await monthSummary(b.ctx, thisMonth())).invoices).toEqual([]);
    await expect(updateInvoice(b.ctx, inv!.id, { action: "pay", method: "cash" })).rejects.toMatchObject({ status: 404 });
    await expect(setTeamFee(b.ctx, t1, 1)).rejects.toMatchObject({ status: 404 });
  });
});
