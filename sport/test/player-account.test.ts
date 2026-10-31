import { describe, expect, it } from "vitest";
import { getSessionSheet, saveAttendance } from "@/server/attendance";
import {
  acceptPlayerInvitation,
  cancelNotice,
  hasPlayerAccount,
  invitePlayerAccount,
  myChildren,
  myPlayerInvitations,
  playerAccount,
  playerHome,
  submitNotice,
  unlinkPlayerAccount,
} from "@/server/player-account";
import { createPlayer } from "@/server/players";
import { addDays, createSession } from "@/server/schedule";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf, userWithSession } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
const plan = (teamId: string, date: string) =>
  ({ teamId, date, startTime: "15:30", durationMin: 90, kind: "training" }) as const;

describe("akun pemain", () => {
  it("satu pemain satu akun, izin sebelum latihan, hanya melihat data sendiri", async () => {
    const a = await academyOf("Garuda");
    const team = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    const andi = await createPlayer(a.ctx, { fullName: "Andi", birthDate: "2014-01-01", teamIds: [team] });
    const bayu = await createPlayer(a.ctx, { fullName: "Bayu", birthDate: "2014-01-01", teamIds: [team] });
    const future = await createSession(a.ctx, plan(team, addDays(today(), 2)));
    const past = await createSession(a.ctx, plan(team, addDays(today(), -2)));
    await saveAttendance(a.ctx, past, { entries: [{ playerId: andi, status: "present" }] });

    const user = await userWithSession("Andi");
    await invitePlayerAccount(a.ctx, andi, user.email);
    const [invite] = await myPlayerInvitations(user.userId);
    expect(invite).toMatchObject({ academyName: "Garuda", playerName: "Andi", birthDate: "2014-01-01" });

    const stranger = await userWithSession("Orang lain");
    await expect(acceptPlayerInvitation(stranger, invite!.id, "Ibu Sari")).rejects.toMatchObject({ status: 404 });
    expect(await acceptPlayerInvitation(user, invite!.id, "Ibu Sari")).toBe(andi);
    expect(await hasPlayerAccount(user.userId)).toBe(true);

    // Email yang sama tidak bisa diundang dua kali ke pemain yang sama. Satu akun orang tua boleh punya
    // beberapa anak; anak pertama tetap yang tampil sampai dipilih lain.
    await expect(invitePlayerAccount(a.ctx, andi, user.email)).rejects.toMatchObject({ status: 409 });
    await invitePlayerAccount(a.ctx, bayu, user.email, "mother");
    const [second] = await myPlayerInvitations(user.userId);
    expect(await acceptPlayerInvitation(user, second!.id, "Ibu Sari")).toBe(bayu);
    expect((await myChildren(user.userId)).map((k) => k.playerId)).toEqual([andi, bayu]);

    const me = await playerHome(user);
    expect(me).toMatchObject({ fullName: "Andi", teamNames: "KU 10-13", attendance: { rate: 100 } });
    expect(me!.upcoming.map((s) => s.sessionId)).toEqual([future]);

    await submitNotice(user, { sessionId: future, status: "sick", note: "Demam" });
    const sheet = await getSessionSheet(a.ctx, future);
    expect(sheet.roster.find((r) => r.playerId === andi)?.notice).toEqual({ status: "sick", note: "Demam" });
    expect(sheet.roster.find((r) => r.playerId === bayu)?.notice).toBeNull();
    await cancelNotice(user, future);
    expect((await getSessionSheet(a.ctx, future)).roster.find((r) => r.playerId === andi)?.notice).toBeNull();

    await expect(submitNotice(user, { sessionId: past, status: "excused" })).rejects.toMatchObject({ status: 409 });
    await expect(submitNotice(stranger, { sessionId: future, status: "excused" })).rejects.toMatchObject({ status: 404 });

    // Pelatih tanpa hak kelola pemain tidak bisa mengatur akun; pemilik bisa memutus.
    const coach = await staffOf(a, ["coach"], "Tomi");
    await expect(playerAccount(coach, andi)).rejects.toThrow();
    expect((await playerAccount(a.ctx, andi)).accounts.map((x) => x.email)).toEqual([user.email]);
    await unlinkPlayerAccount(a.ctx, andi, user.userId);
    expect((await playerHome(user))?.fullName).toBe("Bayu");
    await unlinkPlayerAccount(a.ctx, bayu);
    expect(await playerHome(user)).toBeNull();
  });
});
