import { withContext } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getSessionSheet, needsAttention, playerAttendance, saveAttendance } from "@/server/attendance";
import { db } from "@/server/db";
import { createPlayer, setPlayerStatus } from "@/server/players";
import {
  addDays,
  createSchedule,
  createSession,
  listSchedules,
  listSessions,
  mondayOf,
  setSessionCancelled,
  stopSchedule,
} from "@/server/schedule";
import { teamCoaches } from "@/server/schema";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const jakartaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

async function setup() {
  const a = await academyOf("Garuda");
  const team = await createTeam(a.ctx, { name: "KU 10-13", ageMin: 10, ageMax: 13 });
  const players: string[] = [];
  for (const fullName of ["Andi", "Bayu", "Cahya"]) {
    players.push(await createPlayer(a.ctx, { fullName, birthDate: "2014-01-01", teamIds: [team] }));
  }
  return { a, team, players };
}

const oneOff = (teamId: string, date: string, startTime = "15:30") => ({
  teamId,
  date,
  startTime,
  durationMin: 90,
  kind: "training" as const,
});

describe("jadwal", () => {
  it("jadwal rutin membuat sesi di hari yang benar, jam lokal akademi, tanpa duplikat", async () => {
    const { a, team } = await setup();
    const today = jakartaToday();
    const monday = mondayOf(today);
    await createSchedule(a.ctx, { teamId: team, weekdays: [2, 4], startTime: "15:30", durationMin: 90, startsOn: monday });
    const range = { from: addDays(monday, 7), to: addDays(monday, 13) };
    const week = await listSessions(a.ctx, range);
    expect(week.map((s) => [s.date, s.startTime, s.endTime])).toEqual([
      [addDays(monday, 8), "15:30", "17:00"],
      [addDays(monday, 10), "15:30", "17:00"],
    ]);
    expect(week[0]).toMatchObject({ teamName: "KU 10-13", rosterCount: 3, recordedCount: 0 });
    // 15:30 WIB = 08:30 UTC.
    const [utc] = (await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.execute(sql`SELECT to_char(starts_at AT TIME ZONE 'UTC', 'HH24:MI') AS t FROM bola.sessions WHERE id = ${week[0]!.id}::uuid`),
    )) as unknown as { t: string }[];
    expect(utc!.t).toBe("08:30");
    expect(await listSessions(a.ctx, range)).toHaveLength(2);
    expect(await listSchedules(a.ctx)).toHaveLength(2);
  });

  it("menghentikan jadwal menghapus sesi mendatang yang belum diabsen saja", async () => {
    const { a, team, players } = await setup();
    const today = jakartaToday();
    const scheduleIds = await createSchedule(a.ctx, {
      teamId: team,
      weekdays: [1, 2, 3, 4, 5, 6, 7],
      startTime: "00:00",
      durationMin: 60,
      startsOn: addDays(today, -3),
    });
    const past = (await listSessions(a.ctx, { from: addDays(today, -3), to: addDays(today, -1) }))[0]!;
    await saveAttendance(a.ctx, past.id, { entries: [{ playerId: players[0]!, status: "present" }] });
    for (const id of scheduleIds) await stopSchedule(a.ctx, id);
    expect(await listSessions(a.ctx, { from: addDays(today, 1), to: addDays(today, 14) })).toEqual([]);
    const kept = await listSessions(a.ctx, { from: addDays(today, -3), to: addDays(today, -1) });
    expect(kept.map((s) => s.id)).toContain(past.id);
    expect(await listSchedules(a.ctx)).toEqual([]);
  });

  it("kalender tidak membuat sesi tanpa batas ke masa depan", async () => {
    const { a, team } = await setup();
    await createSchedule(a.ctx, { teamId: team, weekdays: [3], startTime: "16:00", durationMin: 60, startsOn: jakartaToday() });
    expect(await listSessions(a.ctx, { from: "2099-01-01", to: "2099-01-07" })).toEqual([]);
  });
});

describe("absensi", () => {
  it("mengisi absensi hari ini, mengubahnya, dan riwayat tetap utuh setelah pemain dinonaktifkan", async () => {
    const { a, team, players } = await setup();
    const id = await createSession(a.ctx, oneOff(team, jakartaToday()));
    let sheet = await getSessionSheet(a.ctx, id);
    expect(sheet.canRecord).toBe(true);
    expect(sheet.roster.map((r) => r.fullName)).toEqual(["Andi", "Bayu", "Cahya"]);
    await saveAttendance(a.ctx, id, {
      entries: [
        { playerId: players[0]!, status: "present" },
        { playerId: players[1]!, status: "sick" },
      ],
    });
    await saveAttendance(a.ctx, id, { entries: [{ playerId: players[1]!, status: "present" }] });
    sheet = await getSessionSheet(a.ctx, id);
    expect(sheet.roster.map((r) => r.status)).toEqual(["present", "present", null]);
    expect(sheet.session).toMatchObject({ recordedCount: 2, presentCount: 2 });

    await setPlayerStatus(a.ctx, players[1]!, "inactive");
    sheet = await getSessionSheet(a.ctx, id);
    expect(sheet.roster.map((r) => r.fullName)).toEqual(["Andi", "Bayu", "Cahya"]);
    const history = await playerAttendance(a.ctx, players[0]!);
    expect(history).toMatchObject({ rate: 100, recorded: 1 });
  });

  it("absensi belum bisa diisi untuk sesi besok atau sesi yang dibatalkan", async () => {
    const { a, team, players } = await setup();
    const tomorrow = await createSession(a.ctx, oneOff(team, addDays(jakartaToday(), 1)));
    expect((await getSessionSheet(a.ctx, tomorrow)).canRecord).toBe(false);
    await expect(
      saveAttendance(a.ctx, tomorrow, { entries: [{ playerId: players[0]!, status: "present" }] }),
    ).rejects.toMatchObject({ status: 409 });
    const today = await createSession(a.ctx, oneOff(team, jakartaToday()));
    await setSessionCancelled(a.ctx, today, true, { reason: "Hujan deras" });
    const sheet = await getSessionSheet(a.ctx, today);
    expect(sheet).toMatchObject({ canRecord: false, session: { status: "cancelled", cancelReason: "Hujan deras" } });
  });

  it("pemain dari tim lain tidak bisa dimasukkan ke absensi", async () => {
    const { a, team } = await setup();
    const other = await createTeam(a.ctx, { name: "KU 14-17", ageMin: null, ageMax: null });
    const outsider = await createPlayer(a.ctx, { fullName: "Dodi", birthDate: "2010-01-01", teamIds: [other] });
    const id = await createSession(a.ctx, oneOff(team, jakartaToday()));
    await expect(saveAttendance(a.ctx, id, { entries: [{ playerId: outsider, status: "present" }] })).rejects.toMatchObject({
      status: 422,
    });
  });

  it("pelatih mengatur jadwal dan absensi hanya untuk tim yang dia pegang", async () => {
    const { a, team, players } = await setup();
    const other = await createTeam(a.ctx, { name: "KU 14-17", ageMin: null, ageMax: null });
    const mine = await createSession(a.ctx, oneOff(team, jakartaToday()));
    const theirs = await createSession(a.ctx, oneOff(other, jakartaToday(), "18:00"));
    const coach = await staffOf(a, ["coach"], "Coach Tomi");
    await expect(getSessionSheet(coach, mine)).rejects.toMatchObject({ status: 404 });
    expect(await listSessions(coach, { from: jakartaToday(), to: jakartaToday() })).toEqual([]);

    await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.insert(teamCoaches).values({ businessId: a.id, teamId: team, membershipId: coach.membershipId }),
    );
    expect((await listSessions(coach, { from: jakartaToday(), to: jakartaToday() })).map((s) => s.id)).toEqual([mine]);
    await saveAttendance(coach, mine, { entries: [{ playerId: players[0]!, status: "present" }] });
    await expect(getSessionSheet(coach, theirs)).rejects.toMatchObject({ status: 404 });
    await expect(createSession(coach, oneOff(other, jakartaToday(), "18:00"))).rejects.toMatchObject({ status: 404 });
    await expect(createSession(coach, oneOff(team, jakartaToday(), "20:00"))).resolves.toBeTruthy();
  });

  it("akademi lain tidak bisa melihat atau mengisi absensi", async () => {
    const { a, team, players } = await setup();
    const b = await academyOf("Elang");
    const id = await createSession(a.ctx, oneOff(team, jakartaToday()));
    await expect(getSessionSheet(b.ctx, id)).rejects.toMatchObject({ status: 404 });
    await expect(saveAttendance(b.ctx, id, { entries: [{ playerId: players[0]!, status: "present" }] })).rejects.toMatchObject({
      status: 404,
    });
    await expect(createSession(b.ctx, oneOff(team, jakartaToday()))).rejects.toMatchObject({ status: 404 });
  });

  it("pemain yang alpa 3 kali berturut-turut masuk daftar perlu perhatian", async () => {
    const { a, team, players } = await setup();
    const today = jakartaToday();
    const ids: string[] = [];
    for (const d of [-4, -3, -2, -1]) ids.push(await createSession(a.ctx, oneOff(team, addDays(today, d))));
    const mark = (i: number, status: "present" | "absent" | "excused", who = players[0]!) =>
      saveAttendance(a.ctx, ids[i]!, { entries: [{ playerId: who, status }] });
    await mark(0, "present");
    await mark(1, "absent");
    await mark(2, "absent");
    await mark(3, "absent");
    await mark(1, "absent", players[1]!);
    await mark(2, "excused", players[1]!);
    await mark(3, "absent", players[1]!);
    const list = await needsAttention(a.ctx);
    expect(list.map((x) => [x.fullName, x.streak])).toEqual([["Andi", 3]]);
  });
});
