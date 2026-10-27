import { describe, expect, it } from "vitest";
import { createAnnouncement, archiveAnnouncement, listAnnouncements, announcementsForPlayer } from "@/server/announcements";
import { inAcademy } from "@/server/context";
import { createPlayer } from "@/server/players";
import { teamCoaches } from "@/server/schema";
import { createTeam } from "@/server/teams";
import { withContext } from "@saturoom/core/db";
import { db } from "@/server/db";
import { acceptPlayerInvitation, invitePlayerAccount, myPlayerInvitations, playerHome } from "@/server/player-account";
import { academyOf, staffOf, userWithSession } from "./helpers";

async function coachOf(a: Awaited<ReturnType<typeof academyOf>>, teamId: string) {
  const coach = await staffOf(a, ["coach"], "Pelatih");
  await withContext(db(), { userId: a.ctx.userId, businessId: a.id }, (tx) =>
    tx.insert(teamCoaches).values({ businessId: a.id, teamId, membershipId: coach.membershipId }),
  );
  return coach;
}

describe("pengumuman", () => {
  it("pemilik menulis untuk seluruh akademi dan untuk satu tim", async () => {
    const a = await academyOf("Garuda");
    const u10 = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    await createAnnouncement(a.ctx, { title: "Libur Lebaran", body: "Latihan libur minggu depan." });
    await createAnnouncement(a.ctx, { title: "Kumpul U-10", body: "Bawa sepatu bola.", teamId: u10 });
    const list = await listAnnouncements(a.ctx);
    expect(list.map((x) => x.title).sort()).toEqual(["Kumpul U-10", "Libur Lebaran"]);
    expect(list.find((x) => x.title === "Kumpul U-10")?.teamName).toBe("U-10");
  });

  it("pelatih hanya bisa menulis untuk timnya dan hanya melihat yang relevan", async () => {
    const a = await academyOf("Garuda");
    const u10 = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const u12 = await createTeam(a.ctx, { name: "U-12", ageMin: null, ageMax: null });
    const coach = await coachOf(a, u10);
    await createAnnouncement(a.ctx, { title: "Semua", body: "Untuk semua." });
    await createAnnouncement(a.ctx, { title: "Khusus U-12", body: "Hanya U-12.", teamId: u12 });
    await expect(createAnnouncement(coach, { title: "Semua", body: "Coba." })).rejects.toMatchObject({ status: 403 });
    await expect(createAnnouncement(coach, { title: "U-12", body: "Coba.", teamId: u12 })).rejects.toMatchObject({ status: 403 });
    await createAnnouncement(coach, { title: "Latihan tambahan", body: "Kamis sore.", teamId: u10 });
    const seen = (await listAnnouncements(coach)).map((x) => x.title).sort();
    expect(seen).toEqual(["Latihan tambahan", "Semua"]);
  });

  it("pelatih hanya mengarsipkan miliknya; pemilik mengarsipkan apa saja", async () => {
    const a = await academyOf("Garuda");
    const u10 = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const coach = await coachOf(a, u10);
    const ownerPost = await createAnnouncement(a.ctx, { title: "Dari pemilik", body: "Halo.", teamId: u10 });
    const coachPost = await createAnnouncement(coach, { title: "Dari pelatih", body: "Halo.", teamId: u10 });
    await expect(archiveAnnouncement(coach, ownerPost)).rejects.toMatchObject({ status: 403 });
    await archiveAnnouncement(coach, coachPost);
    await archiveAnnouncement(a.ctx, ownerPost);
    expect(await listAnnouncements(a.ctx)).toHaveLength(0);
  });

  it("pemain melihat pengumuman akademi dan timnya saja", async () => {
    const a = await academyOf("Garuda");
    const u10 = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const u12 = await createTeam(a.ctx, { name: "U-12", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [u10] });
    await createAnnouncement(a.ctx, { title: "Semua", body: "Untuk semua." });
    await createAnnouncement(a.ctx, { title: "U-10", body: "Untuk U-10.", teamId: u10 });
    await createAnnouncement(a.ctx, { title: "U-12", body: "Untuk U-12.", teamId: u12 });
    const seen = await inAcademy(a.ctx, (tx) => announcementsForPlayer(tx, pid));
    expect(seen.map((x) => x.title).sort()).toEqual(["Semua", "U-10"]);
  });

  it("akun pemain menerima pengumuman di portalnya, hanya yang untuk dia", async () => {
    const a = await academyOf("Garuda");
    const u10 = await createTeam(a.ctx, { name: "U-10", ageMin: null, ageMax: null });
    const u12 = await createTeam(a.ctx, { name: "U-12", ageMin: null, ageMax: null });
    const pid = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2015-03-14", teamIds: [u10] });
    const user = await userWithSession("Raka");
    await invitePlayerAccount(a.ctx, pid, user.email);
    const [invite] = await myPlayerInvitations(user.userId);
    await acceptPlayerInvitation(user, invite!.id, "Ibu Sari");
    await createAnnouncement(a.ctx, { title: "Libur", body: "Libur minggu depan." });
    await createAnnouncement(a.ctx, { title: "Hanya U-12", body: "Bukan untuk Raka.", teamId: u12 });
    const me = await playerHome(user);
    expect(me!.announcements.map((x) => x.title)).toEqual(["Libur"]);
    expect(me!.announcements[0]!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("tidak bocor antar-akademi", async () => {
    const a = await academyOf("Garuda");
    const b = await academyOf("Elang");
    await createAnnouncement(a.ctx, { title: "Rahasia Garuda", body: "Hanya Garuda." });
    expect(await listAnnouncements(b.ctx)).toHaveLength(0);
  });

  it("bendahara bisa membaca tapi tidak menulis", async () => {
    const a = await academyOf("Garuda");
    await createAnnouncement(a.ctx, { title: "Info", body: "Untuk semua." });
    const treasurer = await staffOf(a, ["treasurer"], "Bendahara");
    expect(await listAnnouncements(treasurer)).toHaveLength(1);
    await expect(createAnnouncement(treasurer, { title: "X", body: "Coba." })).rejects.toMatchObject({ status: 403 });
  });
});
