import { describe, expect, it } from "vitest";
import { switchAcademy } from "@/server/academy";
import { loadAcademyContext } from "@/server/context";
import { listTeams } from "@/server/teams";
import { createTeam } from "@/server/teams";
import {
  acceptInvitation,
  inviteStaff,
  listStaff,
  myInvitations,
  revokeInvitation,
  setStaffStatus,
  updateStaff,
} from "@/server/staff";
import { academyOf, refresh, staffOf, userWithSession } from "./helpers";

describe("staf dan undangan", () => {
  it("undangan diterima oleh pemilik email: peran dan tim langsung berlaku", async () => {
    const a = await academyOf("Garuda");
    const team = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    const coach = await userWithSession("Coach Tomi");
    await inviteStaff(a.ctx, { email: coach.email.toUpperCase(), roles: ["coach"], teamIds: [team] });

    const stranger = await userWithSession("Orang lain");
    expect(await myInvitations(stranger.userId)).toEqual([]);
    const [inv] = await myInvitations(coach.userId);
    expect(inv).toMatchObject({ academyName: "Garuda", roles: ["coach"] });
    await expect(acceptInvitation(stranger, inv!.id)).rejects.toMatchObject({ status: 404 });

    expect(await acceptInvitation(coach, inv!.id)).toBe(a.id);
    const ctx = await loadAcademyContext(await refresh(coach));
    expect(ctx.roles).toEqual(["coach"]);
    expect((await listTeams(ctx)).map((t) => t.id)).toEqual([team]);
    expect(await myInvitations(coach.userId)).toEqual([]);
    await expect(acceptInvitation(coach, inv!.id)).rejects.toMatchObject({ status: 404 });
  });

  it("undangan yang dibatalkan tidak bisa diterima; staf aktif tidak bisa diundang lagi", async () => {
    const a = await academyOf("Garuda");
    const u = await userWithSession("Rina");
    const id = await inviteStaff(a.ctx, { email: u.email, roles: ["admin"], teamIds: [] });
    await revokeInvitation(a.ctx, id);
    expect(await myInvitations(u.userId)).toEqual([]);
    const id2 = await inviteStaff(a.ctx, { email: u.email, roles: ["admin"], teamIds: [] });
    await acceptInvitation(u, id2);
    await expect(inviteStaff(a.ctx, { email: u.email, roles: ["coach"], teamIds: [] })).rejects.toMatchObject({ status: 409 });
  });

  it("peran ganda dan penugasan tim bisa diubah; izin digabung", async () => {
    const a = await academyOf("Garuda");
    const t = await createTeam(a.ctx, { name: "KU 6-9", ageMin: null, ageMax: null });
    const coach = await staffOf(a, ["coach"], "Tomi");
    await updateStaff(a.ctx, coach.membershipId, { roles: ["coach", "admin"], teamIds: [t] });
    const { members } = await listStaff(a.ctx);
    const m = members.find((x) => x.membershipId === coach.membershipId)!;
    expect(m.roles).toEqual(["admin", "coach"]);
    expect(m.teams.map((x) => x.id)).toEqual([t]);
    const fresh = await loadAcademyContext(coach.session);
    expect(fresh.can("guardians.read")).toBe(true);
  });

  it("admin tidak bisa membuat atau mengubah Pemilik; akademi selalu punya Pemilik", async () => {
    const a = await academyOf("Garuda");
    const admin = await staffOf(a, ["admin"], "Rina");
    await expect(inviteStaff(admin, { email: "x@contoh.id", roles: ["owner"], teamIds: [] })).rejects.toMatchObject({ status: 403 });
    await expect(updateStaff(admin, a.ctx.membershipId, { roles: ["coach"], teamIds: [] })).rejects.toMatchObject({ status: 403 });
    await expect(setStaffStatus(admin, a.ctx.membershipId, "suspended")).rejects.toMatchObject({ status: 403 });
    await expect(updateStaff(a.ctx, a.ctx.membershipId, { roles: ["admin"], teamIds: [] })).rejects.toMatchObject({
      code: "last_owner",
    });
    await expect(setStaffStatus(a.ctx, a.ctx.membershipId, "suspended")).rejects.toMatchObject({ code: "self" });
  });

  it("pelatih dan kepala pelatih tidak bisa mengelola staf; staf nonaktif kehilangan akses", async () => {
    const a = await academyOf("Garuda");
    const coach = await staffOf(a, ["coach"], "Tomi");
    const head = await staffOf(a, ["head_coach"], "Budi");
    await expect(listStaff(coach)).rejects.toMatchObject({ status: 403 });
    expect((await listStaff(head)).members).toHaveLength(3);
    await expect(inviteStaff(head, { email: "y@contoh.id", roles: ["coach"], teamIds: [] })).rejects.toMatchObject({ status: 403 });
    await setStaffStatus(a.ctx, coach.membershipId, "suspended");
    await expect(loadAcademyContext(coach.session)).rejects.toMatchObject({ code: "no_academy" });
    await setStaffStatus(a.ctx, coach.membershipId, "active");
    await expect(loadAcademyContext(coach.session)).resolves.toBeTruthy();
  });

  it("akademi lain tidak melihat staf atau undangan, dan tidak bisa mengubah staf di sini", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    const coach = await staffOf(a, ["coach"], "Tomi");
    await inviteStaff(a.ctx, { email: "z@contoh.id", roles: ["coach"], teamIds: [] });
    const seen = await listStaff(b.ctx);
    expect(seen.members.map((m) => m.membershipId)).toEqual([b.ctx.membershipId]);
    expect(seen.invites).toEqual([]);
    await expect(updateStaff(b.ctx, coach.membershipId, { roles: ["admin"], teamIds: [] })).rejects.toMatchObject({ status: 404 });
    await expect(switchAcademy(coach.session, b.id)).rejects.toMatchObject({ status: 404 });
  });
});
