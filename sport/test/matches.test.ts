import { withContext } from "@saturoom/core/db";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { getMatch, matchesOverview, saveMatch } from "@/server/matches";
import { createPlayer } from "@/server/players";
import { createSession } from "@/server/schedule";
import { teamCoaches } from "@/server/schema";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const session = (teamId: string, kind: "training" | "match", date = today, opponent?: string, startTime = "15:30") => ({
  teamId, date, startTime, durationMin: 90, kind, opponent: opponent ?? null,
});
const base = { opponent: "SSB Elang", homeAway: "home" as const, scoreUs: null, scoreThem: null, report: null, lineup: [] as { playerId: string; role: "starter" | "bench" }[] };

async function setup() {
  const a = await academyOf("Garuda");
  const team = await createTeam(a.ctx, { name: "KU 10-13", ageMin: 10, ageMax: 13 });
  const other = await createTeam(a.ctx, { name: "KU 14-17", ageMin: 14, ageMax: 17 });
  const p1 = await createPlayer(a.ctx, { fullName: "Andi", birthDate: "2014-01-01", teamIds: [team] });
  const p2 = await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2014-01-01", teamIds: [team] });
  const stranger = await createPlayer(a.ctx, { fullName: "Candra", birthDate: "2009-01-01", teamIds: [other] });
  return { a, team, other, p1, p2, stranger };
}

describe("pertandingan", () => {
  it("menyimpan lawan, skor, dan susunan; membaca ulang utuh", async () => {
    const { a, team, p1, p2 } = await setup();
    const id = await createSession(a.ctx, session(team, "match", today, "SSB Elang"));
    expect((await getMatch(a.ctx, id)).detail.opponent).toBe("SSB Elang");
    await saveMatch(a.ctx, id, { ...base, scoreUs: 3, scoreThem: 1, report: "Menang meyakinkan", lineup: [{ playerId: p1, role: "starter" }, { playerId: p2, role: "bench" }] });
    const m = await getMatch(a.ctx, id);
    expect(m.detail).toMatchObject({ opponent: "SSB Elang", scoreUs: 3, scoreThem: 1, report: "Menang meyakinkan" });
    expect(m.roster.find((r) => r.playerId === p1)?.role).toBe("starter");
    expect(m.roster.find((r) => r.playerId === p2)?.role).toBe("bench");
    // Disimpan ulang dengan susunan lebih kecil: yang lama dihapus.
    await saveMatch(a.ctx, id, { ...base, scoreUs: 3, scoreThem: 1, lineup: [{ playerId: p2, role: "starter" }] });
    const again = await getMatch(a.ctx, id);
    expect(again.roster.find((r) => r.playerId === p1)?.role).toBeNull();
    expect(again.roster.find((r) => r.playerId === p2)?.role).toBe("starter");
  });

  it("sesi latihan bukan pertandingan, dan pemain luar tim ditolak di susunan", async () => {
    const { a, team, stranger } = await setup();
    const training = await createSession(a.ctx, session(team, "training"));
    await expect(getMatch(a.ctx, training)).rejects.toMatchObject({ status: 404 });
    const match = await createSession(a.ctx, session(team, "match", today, undefined, "18:00"));
    await expect(saveMatch(a.ctx, match, { ...base, lineup: [{ playerId: stranger, role: "starter" }] })).rejects.toMatchObject({ status: 422 });
  });

  it("pelatih hanya bisa mengisi pertandingan tim yang dipegangnya", async () => {
    const { a, team, other } = await setup();
    const mine = await createSession(a.ctx, session(team, "match"));
    const theirs = await createSession(a.ctx, session(other, "match", today, undefined, "18:00"));
    const coach = await staffOf(a, ["coach"], "Coach Tomi");
    await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.insert(teamCoaches).values({ businessId: a.id, teamId: team, membershipId: coach.membershipId }),
    );
    await expect(saveMatch(coach, mine, { ...base, scoreUs: 1, scoreThem: 1 })).resolves.toBeUndefined();
    await expect(getMatch(coach, theirs)).rejects.toMatchObject({ status: 404 });
    await expect(saveMatch(coach, theirs, base)).rejects.toMatchObject({ status: 404 });
  });

  it("ringkasan menghitung menang, seri, kalah dan menunjuk pertandingan berikutnya", async () => {
    const { a, team } = await setup();
    const w = await createSession(a.ctx, session(team, "match", yesterday, "Tim A"));
    const l = await createSession(a.ctx, session(team, "match", yesterday, "Tim B", "18:00"));
    await createSession(a.ctx, { ...session(team, "match", today, "Tim C", "23:00"), durationMin: 60 });
    await saveMatch(a.ctx, w, { ...base, opponent: "Tim A", scoreUs: 2, scoreThem: 0 });
    await saveMatch(a.ctx, l, { ...base, opponent: "Tim B", scoreUs: 0, scoreThem: 4 });
    const o = await matchesOverview(a.ctx);
    expect(o.record).toEqual({ w: 1, d: 0, l: 1, goalsFor: 2, goalsAgainst: 4 });
    expect(o.recent).toHaveLength(2);
    expect(o.next?.opponent).toBe("Tim C");
  });
});
