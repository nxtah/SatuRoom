import { describe, expect, it } from "vitest";
import { loadAcademyContext } from "@/server/context";
import { archiveBranch, createBranch, listBranches } from "@/server/branches";
import { listLocations } from "@/server/locations";
import { listModules, setModule } from "@/server/modules";
import { listPlayers, createPlayer } from "@/server/players";
import { createTeam, listTeams } from "@/server/teams";
import { listTeamFees, setTeamFee } from "@/server/fees";
import { listAnnouncements } from "@/server/announcements";
import { inviteStaff, listStaff, myInvitations, acceptInvitation } from "@/server/staff";
import { academyOf, refresh, staffOf, userWithSession } from "./helpers";

describe("cabang dan batas data per cabang", () => {
  it("staf cabang hanya melihat tim, pemain, iuran, dan staf cabangnya", async () => {
    const a = await academyOf("Garuda Cabang");
    const dago = await createBranch(a.ctx, { name: "Dago" });
    const locs = await listLocations(a.ctx);
    const dagoLoc = locs.find((l) => l.branchId === dago)!;
    const mainLoc = locs.find((l) => l.branchId !== dago)!;
    expect(dagoLoc.name).toBe("Lapangan Dago");

    const tMain = await createTeam(a.ctx, { name: "KU 10 Pusat", ageMin: null, ageMax: null, locationId: mainLoc.id });
    const tDago = await createTeam(a.ctx, { name: "KU 10 Dago", ageMin: null, ageMax: null, locationId: dagoLoc.id });
    await createPlayer(a.ctx, { fullName: "Andi Pusat", birthDate: "2015-01-01", teamIds: [tMain] } as never);
    await createPlayer(a.ctx, { fullName: "Budi Dago", birthDate: "2015-01-01", teamIds: [tDago] } as never);
    await setTeamFee(a.ctx, tMain, 100000);
    await setTeamFee(a.ctx, tDago, 150000);

    const u = await userWithSession("Admin Dago");
    await inviteStaff(a.ctx, { email: u.email, roles: ["admin"], branchIds: [dago] });
    const [inv] = await myInvitations(u.userId);
    await acceptInvitation(u, inv!.id);
    const ctx = await loadAcademyContext(await refresh(u));
    expect(ctx.branchIds).toEqual([dago]);

    expect((await listTeams(ctx)).map((t) => t.name)).toEqual(["KU 10 Dago"]);
    expect((await listPlayers(ctx, {})).map((p) => p.fullName)).toEqual(["Budi Dago"]);
    expect((await listTeamFees(ctx)).map((f) => f.teamName)).toEqual(["KU 10 Dago"]);
    expect((await listBranches(ctx)).map((b) => b.name)).toEqual(["Dago"]);
    expect((await listLocations(ctx)).every((l) => l.branchId === dago)).toBe(true);
    // Staf cabang tidak terlihat oleh sesama staf cabang lain; pemilik melihat semua.
    expect((await listStaff(a.ctx)).members.find((m) => m.userId === u.userId)!.branches.map((b) => b.name)).toEqual(["Dago"]);

    // Admin cabang tidak bisa membuat cabang atau mengundang ke cabang lain.
    await expect(createBranch(ctx, { name: "Lain" })).rejects.toMatchObject({ status: 403 });
    const other = await userWithSession("Calon");
    await expect(inviteStaff(ctx, { email: other.email, roles: ["coach"], branchIds: [mainLoc.branchId] })).rejects.toMatchObject({ status: 403 });

    // Cabang dengan tim aktif dan cabang utama tidak bisa diarsipkan.
    await expect(archiveBranch(a.ctx, dago)).rejects.toMatchObject({ status: 409 });
    await expect(archiveBranch(a.ctx, mainLoc.branchId)).rejects.toMatchObject({ status: 409 });
  });

  it("cabang akademi lain tidak terlihat dan tidak bisa dipakai", async () => {
    const a = await academyOf("Garuda Iso");
    const b = await academyOf("Elang Iso");
    const dago = await createBranch(a.ctx, { name: "Dago" });
    expect((await listBranches(b.ctx)).map((x) => x.name)).toEqual(["Cabang utama"]);
    const u = await userWithSession("Calon B");
    await expect(inviteStaff(b.ctx, { email: u.email, roles: ["coach"], branchIds: [dago] })).rejects.toMatchObject({ status: 422 });
  });
});

describe("saklar modul", () => {
  it("modul mati menolak aksinya; modul yang bergantung ikut mati", async () => {
    const a = await academyOf("Garuda Modul");
    await setModule(a.ctx, "announcements", false);
    let ctx = await loadAcademyContext(a.session);
    await expect(listAnnouncements(ctx)).rejects.toMatchObject({ status: 403, code: "module_off" });

    await setModule(a.ctx, "accounting", false);
    ctx = await loadAcademyContext(a.session);
    expect(ctx.modules.has("payroll")).toBe(false);
    expect(ctx.modules.has("store")).toBe(false);
    const list = await listModules(ctx);
    expect(list.find((m) => m.key === "payroll")).toMatchObject({ enabled: true, active: false });

    await setModule(ctx, "announcements", true);
    ctx = await loadAcademyContext(a.session);
    expect(await listAnnouncements(ctx)).toEqual([]);

    const admin = await staffOf(a, ["admin"], "Admin Modul");
    await expect(setModule(admin, "billing", false)).rejects.toMatchObject({ status: 403 });
    await expect(setModule(a.ctx, "tidak_ada", false)).rejects.toMatchObject({ status: 422 });
  });
});
