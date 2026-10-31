import { describe, expect, it } from "vitest";
import { trialBalance } from "@/server/accounting";
import { createAnnouncement } from "@/server/announcements";
import {
  addEventTeam,
  addFixture,
  cancelParticipant,
  createEvent,
  getEvent,
  payParticipant,
  registerPlayers,
  setEventStatus,
  setResult,
  setScore,
} from "@/server/events";
import { setModule } from "@/server/modules";
import { myNotifications } from "@/server/notifications";
import {
  parentClose,
  parentCreateTicket,
  parentEvents,
  parentNotifications,
  parentRegister,
  parentReply,
  parentTickets,
  parentUnregister,
} from "@/server/parent-portal";
import { acceptPlayerInvitation, invitePlayerAccount, myPlayerInvitations } from "@/server/player-account";
import { createPlayer } from "@/server/players";
import { closeTicket, listTickets, staffReply } from "@/server/support";
import { createTeam } from "@/server/teams";
import { academyOf, staffOf, userWithSession } from "./helpers";

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

async function setup(name: string) {
  const a = await academyOf(name);
  const team = await createTeam(a.ctx, { name: "U-12", ageMin: null, ageMax: null });
  const raka = await createPlayer(a.ctx, { fullName: "Raka", birthDate: "2014-01-01", teamIds: [team] });
  const dimas = await createPlayer(a.ctx, { fullName: "Dimas", birthDate: "2014-02-01", teamIds: [team] });
  const parent = await userWithSession(`Ortu ${name}`);
  await invitePlayerAccount(a.ctx, raka, parent.email, "mother");
  const [inv] = await myPlayerInvitations(parent.userId);
  await acceptPlayerInvitation(parent, inv!.id, "Ibu Raka");
  return { a, team, raka, dimas, parent };
}

describe("event dan turnamen", () => {
  it("daftar dari portal, bayar, batal dengan pengembalian, hasil; jurnal seimbang", async () => {
    const { a, raka, dimas, parent } = await setup("Event FC");
    const id = await createEvent(a.ctx, { kind: "event", title: "Coaching clinic", startsOn: today(), endsOn: today(), fee: 50_000, capacity: 2, parentSignup: true });
    await expect(parentRegister(parent, id)).rejects.toMatchObject({ status: 409 }); // masih draf

    await setEventStatus(a.ctx, id, "open");
    expect((await parentNotifications(parent)).items[0]?.title).toContain("Coaching clinic");
    await parentRegister(parent, id);
    await expect(parentRegister(parent, id)).rejects.toMatchObject({ status: 409 });
    await registerPlayers(a.ctx, id, [dimas]);
    expect((await myNotifications(a.ctx)).items.some((n) => n.title.includes("Raka mendaftar"))).toBe(true);

    let ev = await getEvent(a.ctx, id);
    const pr = ev.participants.find((p) => p.playerId === raka)!;
    const pd = ev.participants.find((p) => p.playerId === dimas)!;
    await payParticipant(a.ctx, pr.id, "cash", today());
    await payParticipant(a.ctx, pd.id, "transfer", today());
    await expect(parentUnregister(parent, id)).rejects.toMatchObject({ status: 409 });
    await cancelParticipant(a.ctx, pd.id);
    await setResult(a.ctx, pr.id, 1, "Peserta terbaik");
    ev = await getEvent(a.ctx, id);
    expect(ev.event).toMatchObject({ participants: 1, paid: 1 });

    const tb = await trialBalance(a.ctx, today());
    expect(tb.totalDebit).toBe(tb.totalCredit);
    expect(tb.rows.find((r) => r.name === "Pendapatan event")?.credit).toBe(50_000);

    const mine = (await parentEvents(parent))!.find((e) => e.id === id)!;
    expect(mine.mine).toMatchObject({ status: "paid", rank: 1 });
  });

  it("klasemen turnamen: poin, selisih gol", async () => {
    const { a } = await setup("Turnamen FC");
    const id = await createEvent(a.ctx, { kind: "tournament", title: "Piala Kemerdekaan", startsOn: today(), endsOn: today(), fee: 0, parentSignup: false });
    const x = await addEventTeam(a.ctx, id, "Garuda", null, null);
    const y = await addEventTeam(a.ctx, id, "Elang", null, null);
    const z = await addEventTeam(a.ctx, id, "Rajawali", null, null);
    await expect(addEventTeam(a.ctx, id, "garuda", null, null)).rejects.toMatchObject({ status: 409 });
    await setScore(a.ctx, await addFixture(a.ctx, id, x, y, "1", today()), 2, 0);
    await setScore(a.ctx, await addFixture(a.ctx, id, y, z, "1", today()), 1, 1);
    await setScore(a.ctx, await addFixture(a.ctx, id, z, x, "2", today()), 1, 1);
    await addFixture(a.ctx, id, x, z, "3", null);
    const { standings } = await getEvent(a.ctx, id);
    expect(standings.map((s) => [s.name, s.points])).toEqual([["Garuda", 4], ["Rajawali", 2], ["Elang", 1]]);
  });

  it("pelatih tidak bisa membuat event; modul mati menutup portal", async () => {
    const { a, parent } = await setup("Event Aman");
    const coach = await staffOf(a, ["coach"]);
    await expect(createEvent(coach, { kind: "event", title: "Liar", startsOn: today(), endsOn: today(), fee: 0, parentSignup: true })).rejects.toMatchObject({ status: 403 });
    await setModule(a.ctx, "events", false);
    expect(await parentEvents(parent)).toBeNull();
  });
});

describe("layanan orang tua dan notifikasi", () => {
  it("tiket: kirim, dibalas, dibalas lagi, ditutup dengan nilai; hanya milik anaknya", async () => {
    const { a, dimas, parent } = await setup("Layanan FC");
    const id = await parentCreateTicket(parent, { category: "question", subject: "Jadwal libur", body: "Libur lebaran kapan?" });
    expect((await myNotifications(a.ctx)).items[0]?.title).toContain("Jadwal libur");

    let [t] = await listTickets(a.ctx);
    expect(t).toMatchObject({ id, status: "open", playerName: "Raka" });
    await staffReply(a.ctx, id, "Libur tanggal 1-7.");
    expect((await parentNotifications(parent)).unread).toBeGreaterThan(0);
    await parentReply(parent, id, "Terima kasih");
    [t] = await listTickets(a.ctx);
    expect(t!.status).toBe("open");
    expect(t!.messages).toHaveLength(3);
    await parentClose(parent, id, 5);
    expect((await parentTickets(parent))![0]).toMatchObject({ status: "closed", rating: 5 });
    await expect(parentReply(parent, id, "lagi")).rejects.toMatchObject({ status: 409 });

    // Orang tua lain tidak melihat tiket anak ini.
    const other = await userWithSession("Ortu Dimas");
    await invitePlayerAccount(a.ctx, dimas, other.email);
    const [inv] = await myPlayerInvitations(other.userId);
    await acceptPlayerInvitation(other, inv!.id, "Ayah Dimas");
    expect(await parentTickets(other)).toEqual([]);
    await expect(parentReply(other, id, "intip")).rejects.toMatchObject({ status: 404 });

    const coach = await staffOf(a, ["coach"]);
    await expect(listTickets(coach)).rejects.toMatchObject({ status: 403 });
    await closeTicket(a.ctx, id);
  });

  it("pengumuman tim memberi notifikasi ke orang tua pemain tim itu", async () => {
    const { a, team, parent } = await setup("Kabar FC");
    await createAnnouncement(a.ctx, { title: "Latihan pindah jam", body: "Jam 4 sore.", teamId: team });
    expect((await parentNotifications(parent)).items[0]?.title).toBe("Pengumuman: Latihan pindah jam");
  });
});
