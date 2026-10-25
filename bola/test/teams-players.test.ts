import { withContext } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { createPlayer, getPlayer, listPlayers, setPlayerStatus, updatePlayer } from "@/server/players";
import { teamCoaches } from "@/server/schema";
import { archiveTeam, createTeam, listTeams, updateTeam } from "@/server/teams";
import { academyOf, staffOf } from "./helpers";

const kid = (over: Partial<Parameters<typeof createPlayer>[1]> = {}) => ({
  fullName: "Budi Santoso",
  birthDate: "2015-03-14",
  teamIds: [] as string[],
  ...over,
});

describe("tim dan pemain", () => {
  it("pemilik membuat tim dan pemain; jumlah pemain dan audit tercatat", async () => {
    const a = await academyOf("Garuda");
    const team = await createTeam(a.ctx, { name: "KU 10-13", ageMin: 10, ageMax: 13 });
    const id = await createPlayer(a.ctx, kid({ teamIds: [team], guardianName: "Ibu Sari", guardianPhone: "0812 3456 7890" }));
    const [t] = await listTeams(a.ctx);
    expect(t).toMatchObject({ id: team, name: "KU 10-13", playerCount: 1 });
    const p = await getPlayer(a.ctx, id);
    expect(p.teams.map((x) => x.id)).toEqual([team]);
    expect(p.guardian).toEqual({ name: "Ibu Sari", phone: "0812 3456 7890" });
    const actions = await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.select({ action: auditEvents.action }).from(auditEvents),
    );
    expect(actions.map((r) => r.action)).toEqual(expect.arrayContaining(["team.created", "player.created"]));
  });

  it("nama tim aktif tidak boleh kembar, tapi boleh dipakai lagi setelah diarsipkan", async () => {
    const a = await academyOf("Garuda");
    const t = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    await expect(createTeam(a.ctx, { name: "ku 10-13", ageMin: null, ageMax: null })).rejects.toMatchObject({ status: 409 });
    await archiveTeam(a.ctx, t);
    await expect(createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null })).resolves.toBeTruthy();
  });

  it("pelatih hanya melihat tim dan pemain yang ditugaskan kepadanya", async () => {
    const a = await academyOf("Garuda");
    const mine = await createTeam(a.ctx, { name: "KU 10-13", ageMin: 10, ageMax: 13 });
    const other = await createTeam(a.ctx, { name: "KU 14-17", ageMin: 14, ageMax: 17 });
    const p1 = await createPlayer(a.ctx, kid({ fullName: "Andi", teamIds: [mine] }));
    const p2 = await createPlayer(a.ctx, kid({ fullName: "Bayu", teamIds: [other] }));
    const coach = await staffOf(a, ["coach"], "Coach Tomi");

    expect(await listTeams(coach)).toEqual([]);
    expect(await listPlayers(coach)).toEqual([]);

    await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
      tx.insert(teamCoaches).values({ businessId: a.id, teamId: mine, membershipId: coach.membershipId }),
    );
    expect((await listTeams(coach)).map((t) => t.id)).toEqual([mine]);
    expect((await listPlayers(coach)).map((p) => p.id)).toEqual([p1]);
    await expect(getPlayer(coach, p2)).rejects.toMatchObject({ status: 404 });
    // Pelatih tidak melihat kontak wali dan tidak bisa mengubah data.
    expect((await getPlayer(coach, p1)).guardian).toBeNull();
    await expect(createTeam(coach, { name: "Liar", ageMin: null, ageMax: null })).rejects.toMatchObject({ status: 403 });
    await expect(updatePlayer(coach, p1, kid({ teamIds: [mine] }))).rejects.toMatchObject({ status: 403 });
  });

  it("kepala pelatih mengelola semua tim tanpa melihat kontak wali; peran ganda digabung", async () => {
    const a = await academyOf("Garuda");
    const t = await createTeam(a.ctx, { name: "KU 6-9", ageMin: 6, ageMax: 9 });
    const head = await staffOf(a, ["head_coach"], "Kepala Pelatih");
    const p = await createPlayer(head, kid({ teamIds: [t] }));
    expect((await getPlayer(head, p)).guardian).toBeNull();
    await expect(
      createPlayer(head, kid({ teamIds: [t], guardianPhone: "0812 3456 7890" })),
    ).rejects.toMatchObject({ status: 403 });

    const both = await staffOf(a, ["head_coach", "admin"], "Rina");
    expect((await getPlayer(both, p)).guardian).toEqual({ name: null, phone: null });
  });

  it("akademi lain tidak bisa membaca, mengubah, atau memakai tim akademi ini", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    const t = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    const p = await createPlayer(a.ctx, kid({ teamIds: [t] }));
    expect(await listPlayers(b.ctx)).toEqual([]);
    await expect(getPlayer(b.ctx, p)).rejects.toMatchObject({ status: 404 });
    await expect(updateTeam(b.ctx, t, { name: "Dibajak", ageMin: null, ageMax: null })).rejects.toMatchObject({ status: 404 });
    await expect(setPlayerStatus(b.ctx, p, "inactive")).rejects.toMatchObject({ status: 404 });
    await expect(createPlayer(b.ctx, kid({ teamIds: [t] }))).rejects.toMatchObject({ status: 422 });
    expect((await getPlayer(a.ctx, p)).status).toBe("active");
  });

  it("pemain dinonaktifkan, bukan dihapus; aplikasi tidak punya hak hapus permanen", async () => {
    const a = await academyOf("Garuda");
    const t = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    const p = await createPlayer(a.ctx, kid({ teamIds: [t] }));
    await setPlayerStatus(a.ctx, p, "inactive");
    expect(await listPlayers(a.ctx)).toEqual([]);
    expect((await listPlayers(a.ctx, { status: "inactive" })).map((x) => x.id)).toEqual([p]);
    expect((await listTeams(a.ctx))[0]!.playerCount).toBe(0);
    await expect(
      withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) => tx.execute(sql`DELETE FROM bola.players`)),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
  });

  it("pencarian nama aman dari karakter khusus", async () => {
    const a = await academyOf("Garuda");
    const t = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    await createPlayer(a.ctx, kid({ fullName: "Andi Pratama", teamIds: [t] }));
    await createPlayer(a.ctx, kid({ fullName: "Bayu 100%", teamIds: [t] }));
    expect((await listPlayers(a.ctx, { q: "andi" })).map((p) => p.fullName)).toEqual(["Andi Pratama"]);
    expect((await listPlayers(a.ctx, { q: "%" })).map((p) => p.fullName)).toEqual(["Bayu 100%"]);
    expect(await listPlayers(a.ctx, { teamId: t, q: "_" })).toEqual([]);
  });

  it("saring per tim hanya menampilkan pemain tim itu; pemain boleh di dua tim", async () => {
    const a = await academyOf("Garuda");
    const t1 = await createTeam(a.ctx, { name: "KU 10-13", ageMin: null, ageMax: null });
    const t2 = await createTeam(a.ctx, { name: "Skuad turnamen", ageMin: null, ageMax: null });
    await createPlayer(a.ctx, kid({ fullName: "Andi", teamIds: [t1, t2] }));
    await createPlayer(a.ctx, kid({ fullName: "Bayu", teamIds: [t1] }));
    expect((await listPlayers(a.ctx, { teamId: t1 })).map((p) => p.fullName)).toEqual(["Andi", "Bayu"]);
    expect((await listPlayers(a.ctx, { teamId: t2 })).map((p) => p.fullName)).toEqual(["Andi"]);
    const counts = Object.fromEntries((await listTeams(a.ctx)).map((t) => [t.name, t.playerCount]));
    expect(counts).toEqual({ "KU 10-13": 2, "Skuad turnamen": 1 });
  });
});
