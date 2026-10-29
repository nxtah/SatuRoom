import { withContext } from "@saturoom/core/db";
import { describe, expect, it } from "vitest";
import { saveAttendance } from "@/server/attendance";
import { db } from "@/server/db";
import { createPlayer } from "@/server/players";
import { addDays, createSession } from "@/server/schedule";
import { teamCoaches } from "@/server/schema";
import { homeStats } from "@/server/stats";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

describe("statistik beranda", () => {
  it("menghitung pemain dan kehadiran; pelatih hanya melihat timnya; akademi lain nol", async () => {
    const a = await academyOf("Garuda");
    const t1 = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    const t2 = await createTeam(a.ctx, { name: "KU 14-17", ageMin: null, ageMax: null });
    const p1 = await createPlayer(a.ctx, { fullName: "Andi", birthDate: "2014-01-01", teamIds: [t1] });
    const p2 = await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2014-01-01", teamIds: [t1] });
    const p3 = await createPlayer(a.ctx, { fullName: "Cahya", birthDate: "2010-01-01", teamIds: [t2] });
    const s1 = await createSession(a.ctx, { teamId: t1, date: addDays(today(), -1), startTime: "15:30", durationMin: 90, kind: "training" });
    const s2 = await createSession(a.ctx, { teamId: t2, date: addDays(today(), -1), startTime: "18:00", durationMin: 90, kind: "training" });
    await saveAttendance(a.ctx, s1, { entries: [{ playerId: p1, status: "present" }, { playerId: p2, status: "absent" }] });
    await saveAttendance(a.ctx, s2, { entries: [{ playerId: p3, status: "present" }] });

    const all = await homeStats(a.ctx);
    expect(all).toMatchObject({ activePlayers: 3, newPlayersThisMonth: 3, attendanceRate: 67 });
    expect(all.weekly).toHaveLength(6);
    expect(all.perTeam.map((t) => [t.teamName, t.rate, t.players])).toEqual([
      ["KU 10-13", 50, 2],
      ["KU 14-17", 100, 1],
    ]);

    const coach = await staffOf(a, ["coach"], "Tomi");
    await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.insert(teamCoaches).values({ businessId: a.id, teamId: t2, membershipId: coach.membershipId }),
    );
    expect(await homeStats(coach)).toMatchObject({ activePlayers: 1, attendanceRate: 100, perTeam: [{ teamName: "KU 14-17" }] });

    const b = await academyOf("Elang");
    expect(await homeStats(b.ctx)).toMatchObject({ activePlayers: 0, attendanceRate: null, perTeam: [] });
  });
});
