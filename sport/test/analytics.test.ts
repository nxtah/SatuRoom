import { describe, expect, it } from "vitest";
import { createExpense, accountOptions } from "@/server/accounting";
import { analytics } from "@/server/analytics";
import { generateInvoices, setTeamFee, updateInvoice, monthSummary } from "@/server/fees";
import { createPlayer } from "@/server/players";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

describe("analitik", () => {
  it("total pemain, uang per cabang; pelatih ditolak", async () => {
    const a = await academyOf("Analitik FC");
    const t = await createTeam(a.ctx, { name: "U-9", ageMin: null, ageMax: null });
    await createPlayer(a.ctx, { fullName: "Ari", birthDate: "2016-01-01", teamIds: [t] });
    await setTeamFee(a.ctx, t, 100_000);
    await generateInvoices(a.ctx, today().slice(0, 7));
    const inv = (await monthSummary(a.ctx, today().slice(0, 7))).invoices[0]!;
    await updateInvoice(a.ctx, inv.id, { action: "pay", amount: 60_000, method: "cash" });
    const rent = (await accountOptions(a.ctx)).find((x) => x.name === "Sewa lapangan")!.id;
    const cash = (await accountOptions(a.ctx)).find((x) => x.name === "Kas")!.id;
    await createExpense(a.ctx, { note: "Sewa", amount: 25_000, accountId: rent, paidFrom: cash, spentOn: today() });
    const r = await analytics(a.ctx, `${today().slice(0, 7)}-01`, today());
    expect(r.total).toMatchObject({ activePlayers: 1, newPlayers: 1, collected: 60_000, expenses: 25_000, outstanding: 40_000 });
    expect(r.trend).toHaveLength(6);
    const coach = await staffOf(a, ["coach"]);
    await expect(analytics(coach, today(), today())).rejects.toMatchObject({ status: 403 });
  });
});
