import { sql } from "drizzle-orm";
import { withContext } from "@saturoom/core/db";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { loadAcademyContext } from "@/server/context";
import { archiveProgram, createProgram, listPrograms } from "@/server/programs";
import { setModule } from "@/server/modules";
import { createTeam, listTeams } from "@/server/teams";
import {
  attendanceBoard,
  cancelStaffRequest,
  clockIn,
  clockOut,
  createStaffRequest,
  decideStaffRequest,
  listStaffRequests,
  monthlyRecap,
  myAttendance,
  setShifts,
} from "@/server/staff-attendance";
import { academyOf, staffOf } from "./helpers";

describe("program latihan", () => {
  it("program dipasang ke tim, diarsipkan melepas tim, dan terisolasi antar akademi", async () => {
    const a = await academyOf("Garuda Program");
    const b = await academyOf("Elang Program");
    const reg = await createProgram(a.ctx, { name: "Reguler", level: "Pemula", monthlyFee: 250000 });
    await expect(createProgram(a.ctx, { name: "reguler" })).rejects.toMatchObject({ status: 409 });
    const team = await createTeam(a.ctx, { name: "KU 10", ageMin: 9, ageMax: 10, programId: reg });
    expect((await listPrograms(a.ctx))[0]!.teams.map((t) => t.id)).toEqual([team]);
    expect(await listPrograms(b.ctx)).toEqual([]);
    await expect(createTeam(b.ctx, { name: "Curang", ageMin: null, ageMax: null, programId: reg })).rejects.toMatchObject({ status: 422 });

    const coach = await staffOf(a, ["coach"], "Pelatih Program");
    await expect(createProgram(coach, { name: "Elite" })).rejects.toMatchObject({ status: 403 });

    await archiveProgram(a.ctx, reg);
    expect((await listTeams(a.ctx)).find((t) => t.id === team)!.programId).toBeNull();
  });
});

describe("absensi staf", () => {
  it("absen masuk/pulang sekali sehari, koreksi disetujui mengganti catatan, rekap terhitung", async () => {
    const a = await academyOf("Garuda Absen");
    const coach = await staffOf(a, ["coach"], "Pelatih Absen");
    await setShifts(a.ctx, coach.membershipId, { shifts: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, start: "00:00", end: "23:59" })) });
    await expect(setShifts(coach, coach.membershipId, { shifts: [] })).rejects.toMatchObject({ status: 403 });

    await expect(clockOut(coach)).rejects.toMatchObject({ status: 409 });
    await clockIn(coach);
    await expect(clockIn(coach)).rejects.toMatchObject({ status: 409 });
    await clockOut(coach);
    const me = await myAttendance(coach);
    expect(me.clock?.clockOut).not.toBeNull();
    expect(me.shiftToday).not.toBeNull();

    const board = await attendanceBoard(a.ctx);
    expect(board.rows.find((r) => r.membershipId === coach.membershipId)!.status).toMatch(/present|late/);

    // Koreksi kemarin.
    const yesterday = (await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.execute(sql`SELECT to_char(current_date - 1, 'YYYY-MM-DD') AS d`),
    )) as unknown as { d: string }[];
    const day = yesterday[0]!.d;
    const corr = await createStaffRequest(coach, { kind: "correction", date: day, clockIn: "07:00", clockOut: "15:00", reason: "Lupa absen" });
    await expect(decideStaffRequest(coach, corr, { decision: "approved" })).rejects.toMatchObject({ status: 403 });
    await decideStaffRequest(a.ctx, corr, { decision: "approved" });

    const ot = await createStaffRequest(coach, { kind: "overtime", date: day, minutes: 90, reason: "Turnamen" });
    await decideStaffRequest(a.ctx, ot, { decision: "approved" });
    const leave = await createStaffRequest(coach, { kind: "leave", dateFrom: day, dateTo: day, leaveType: "sick", reason: "Demam" });
    await decideStaffRequest(a.ctx, leave, { decision: "rejected", note: "Sudah hadir" });
    const spare = await createStaffRequest(coach, { kind: "overtime", date: day, minutes: 30, reason: "Rapat" });
    await cancelStaffRequest(coach, spare);
    expect(await listStaffRequests(a.ctx, "pending")).toEqual([]);

    const month = day.slice(0, 7);
    const recap = (await monthlyRecap(a.ctx, month)).find((r) => r.membershipId === coach.membershipId)!;
    expect(recap.workedMinutes).toBeGreaterThanOrEqual(480);
    expect(recap.overtimeMinutes).toBe(90);
    expect(recap.leaveDays).toBe(0);

    // Akademi lain tidak melihat apa pun.
    const b = await academyOf("Elang Absen");
    expect((await attendanceBoard(b.ctx)).rows.map((r) => r.name)).not.toContain("Pelatih Absen");
    await expect(decideStaffRequest(b.ctx, spare, { decision: "approved" })).rejects.toMatchObject({ status: 404 });
  });

  it("modul mati menolak absen", async () => {
    const a = await academyOf("Garuda Absen Mati");
    await setModule(a.ctx, "staff_attendance", false);
    const ctx = await loadAcademyContext(a.session);
    await expect(clockIn(ctx)).rejects.toMatchObject({ code: "module_off" });
  });
});
