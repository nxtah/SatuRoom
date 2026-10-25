import { describe, expect, it } from "vitest";
import { getSessionSheet, saveAttendance } from "@/server/attendance";
import {
  acceptGuardianInvitation,
  cancelNotice,
  guardianAccess,
  guardianHome,
  hasChildren,
  inviteGuardian,
  myGuardianInvitations,
  submitNotice,
  unlinkGuardian,
} from "@/server/guardian";
import { createPlayer } from "@/server/players";
import { addDays, createSession } from "@/server/schedule";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf, userWithSession } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plan = (teamId: string, date: string) =>
  ({ teamId, date, startTime: "15:30", durationMin: 90, kind: "training" }) as const;

describe("portal orang tua", () => {
  it("undangan, izin sebelum latihan, dan hanya melihat anak sendiri", async () => {
    const a = await academyOf("Garuda");
    const team = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    const kid = await createPlayer(a.ctx, { fullName: "Andi", birthDate: "2014-01-01", teamIds: [team] });
    await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2014-01-01", teamIds: [team] });
    const future = await createSession(a.ctx, plan(team, addDays(today(), 2)));
    const past = await createSession(a.ctx, plan(team, addDays(today(), -2)));
    await saveAttendance(a.ctx, past, { entries: [{ playerId: kid, status: "present" }] });

    const parent = await userWithSession("Ibu Sari");
    expect(await hasChildren(parent.userId)).toBe(false);
    await inviteGuardian(a.ctx, kid, parent.email);
    const [invite] = await myGuardianInvitations(parent.userId);
    expect(invite).toMatchObject({ academyName: "Garuda", playerName: "Andi" });

    // Orang lain tidak bisa menerima undangan untuk email yang bukan miliknya.
    const stranger = await userWithSession("Orang lain");
    await expect(acceptGuardianInvitation(stranger, invite!.id)).rejects.toMatchObject({ status: 404 });
    expect(await acceptGuardianInvitation(parent, invite!.id)).toBe(kid);

    const [child] = await guardianHome(parent);
    expect(child).toMatchObject({ fullName: "Andi", teamNames: "KU 10-13", attendance: { rate: 100 } });
    expect(child!.upcoming.map((s) => s.sessionId)).toEqual([future]);

    await submitNotice(parent, { playerId: kid, sessionId: future, status: "sick", note: "Demam" });
    const sheet = await getSessionSheet(a.ctx, future);
    expect(sheet.roster.find((r) => r.playerId === kid)?.notice).toEqual({ status: "sick", note: "Demam" });
    expect(sheet.roster.find((r) => r.playerId !== kid)?.notice).toBeNull();
    await cancelNotice(parent, kid, future);
    expect((await getSessionSheet(a.ctx, future)).roster.find((r) => r.playerId === kid)?.notice).toBeNull();

    // Latihan yang sudah lewat tidak bisa diberi izin; anak orang lain tidak bisa disentuh.
    await expect(submitNotice(parent, { playerId: kid, sessionId: past, status: "excused" })).rejects.toMatchObject({
      status: 409,
    });
    await expect(submitNotice(stranger, { playerId: kid, sessionId: future, status: "excused" })).rejects.toMatchObject({
      status: 404,
    });

    // Pelatih tanpa akses kontak wali tidak bisa mengelola akun wali; pemilik bisa memutuskan.
    const coach = await staffOf(a, ["coach"], "Tomi");
    await expect(guardianAccess(coach, kid)).rejects.toThrow();
    expect((await guardianAccess(a.ctx, kid)).linked.map((g) => g.name)).toEqual(["Ibu Sari"]);
    await unlinkGuardian(a.ctx, kid, parent.userId);
    expect(await guardianHome(parent)).toEqual([]);
  });
});
