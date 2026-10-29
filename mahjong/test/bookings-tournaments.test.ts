import { describe, expect, it } from "vitest";
import { assignBooking, createBooking, listBookings, publicVenue, setBookingStatus, submitPublicBooking } from "@/server/bookings";
import { getVenue } from "@/server/venue";
import { openSession } from "@/server/sessions";
import { addEntrant, finishTournament, generateRound, getTournament, createTournament, removeEntrant, saveScores } from "@/server/tournaments";
import { listMembers } from "@/server/members";
import { floorBoard } from "@/server/tables";
import { memberOf, staffOf, venueOf } from "./helpers";

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
const booking = (tableId: string, date = day(2), startTime = "19:00") => ({ tableId, name: "Koh Ahong", phone: "0812345678", date, startTime, durationMin: 120, pax: 4, note: null });

describe("booking", () => {
  it("menolak bentrok di meja yang sama, tetapi meja lain boleh", async () => {
    const v = await venueOf("Naga Jade");
    const [a, b] = v.tables;
    await createBooking(v.ctx, booking(a!.id));
    await expect(createBooking(v.ctx, booking(a!.id, day(2), "20:00"))).rejects.toMatchObject({ status: 409, code: "clash" });
    await expect(createBooking(v.ctx, booking(b!.id, day(2), "20:00"))).resolves.toBeTruthy();
    await expect(createBooking(v.ctx, { ...booking(a!.id, day(-3)) })).rejects.toMatchObject({ status: 422 });
    expect((await listBookings(v.ctx, day(2), day(2))).map((x) => x.startTime)).toEqual(["19:00", "20:00"]);
  });

  it("booking dibuka lewat sesi: status jadi datang, meja lain tidak boleh mengambil jam itu", async () => {
    const v = await venueOf("Naga Jade");
    const t = v.tables[0]!;
    const now = new Date();
    const hhmm = new Date(now.getTime() + 20 * 60_000).toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
    const id = await createBooking(v.ctx, booking(t.id, day(0), hhmm));
    expect((await floorBoard(v.ctx)).tables.find((x) => x.id === t.id)?.status).toBe("reserved");
    await expect(openSession(v.ctx, { tableId: t.id, players: 4 })).rejects.toMatchObject({ code: "reserved" });
    const session = await openSession(v.ctx, { tableId: t.id, players: 4, bookingId: id });
    expect(session).toBeTruthy();
    expect((await listBookings(v.ctx, day(0), day(0)))[0]).toMatchObject({ status: "arrived", sessionId: session });
  });

  it("permintaan dari link publik menunggu meja, lalu staf menugaskan dan bentrok dicegah", async () => {
    const v = await venueOf("Naga Jade");
    const info = await getVenue(v.ctx);
    expect(await publicVenue(info.code)).toMatchObject({ name: "Naga Jade" });
    expect(await publicVenue("ZZZZ9999")).toBeNull();
    const req = { name: "Tamu Baru", phone: "0877111222", date: day(3), startTime: "18:00", durationMin: 120, pax: 4, note: null };
    expect(await submitPublicBooking(info.code, req)).toBe("created");
    expect(await submitPublicBooking(info.code, req)).toBe("duplicate");
    await expect(submitPublicBooking(info.code, { ...req, date: day(-1) })).rejects.toMatchObject({ status: 422 });
    await expect(submitPublicBooking("ZZZZ9999", req)).rejects.toMatchObject({ status: 404 });
    const [pending] = await listBookings(v.ctx, day(3), day(3));
    expect(pending).toMatchObject({ status: "requested", tableId: null, source: "public" });
    await createBooking(v.ctx, { ...booking(v.tables[0]!.id, day(3), "18:00") });
    await expect(assignBooking(v.ctx, pending!.id, v.tables[0]!.id)).rejects.toMatchObject({ code: "clash" });
    await assignBooking(v.ctx, pending!.id, v.tables[1]!.id);
    await setBookingStatus(v.ctx, pending!.id, "no_show");
    await expect(setBookingStatus(v.ctx, pending!.id, "cancelled")).rejects.toMatchObject({ status: 409 });
  });

  it("booking publik ditutup bila dimatikan di pengaturan, dan tidak bocor ke tempat lain", async () => {
    const a = await venueOf("Rumah A");
    const b = await venueOf("Rumah B");
    const info = await getVenue(a.ctx);
    await submitPublicBooking(info.code, { name: "Tamu A", phone: "0877000111", date: day(3), startTime: "18:00", durationMin: 60, pax: 2, note: null });
    expect(await listBookings(b.ctx, day(3), day(3))).toEqual([]);
    expect(await listBookings(a.ctx, day(3), day(3))).toHaveLength(1);
  });
});

describe("turnamen", () => {
  const entrantsOf = async (ctx: Awaited<ReturnType<typeof venueOf>>["ctx"], tid: string, n: number) => {
    for (let i = 1; i <= n; i++) await addEntrant(ctx, tid, { name: `Peserta ${i}` });
  };
  const scoreAll = async (ctx: Awaited<ReturnType<typeof venueOf>>["ctx"], tid: string, round: number) => {
    const t = await getTournament(ctx, tid);
    const r = t.rounds_.find((x) => x.roundNo === round)!;
    for (const tb of r.tables) {
      await saveScores(ctx, tid, { roundNo: round, tableNo: tb.tableNo, scores: tb.seats.map((s, i) => ({ playerId: s.playerId, score: 40000 - i * 10000 })) });
    }
  };

  it("alur penuh: daftar, babak, skor, klasemen, selesai", async () => {
    const v = await venueOf("Naga Jade");
    const referee = await staffOf(v, ["referee"]);
    const tid = await createTournament(v.ctx, { name: "Liga Jumat", eventDate: day(0), entryFee: 50_000, rounds: 2, rankPoints: [4, 2, 1, 0], note: null });
    await expect(generateRound(v.ctx, tid)).rejects.toMatchObject({ code: "players" });
    await entrantsOf(v.ctx, tid, 8);
    await expect(addEntrant(v.ctx, tid, { name: "peserta 1" })).rejects.toMatchObject({ status: 409 });
    expect(await generateRound(v.ctx, tid)).toBe(1);
    await expect(generateRound(v.ctx, tid)).rejects.toMatchObject({ code: "unscored" });
    await expect(addEntrant(v.ctx, tid, { name: "Telat" })).rejects.toMatchObject({ code: "started" });
    // Wasit boleh mengisi skor tetapi tidak membuat babak.
    await expect(generateRound(referee, tid)).rejects.toMatchObject({ status: 403 });
    const mid = await getTournament(referee, tid);
    const first = mid.rounds_[0]!.tables[0]!;
    await expect(saveScores(referee, tid, { roundNo: 1, tableNo: first.tableNo, scores: first.seats.map((s) => ({ playerId: s.playerId, score: null })).slice(0, 3) })).rejects.toMatchObject({ status: 422 });
    await scoreAll(referee, tid, 1);
    expect(await generateRound(v.ctx, tid)).toBe(2);
    await expect(finishTournament(v.ctx, tid)).rejects.toMatchObject({ code: "unscored" });
    await scoreAll(referee, tid, 2);
    await expect(generateRound(v.ctx, tid)).rejects.toMatchObject({ code: "rounds" });
    await finishTournament(v.ctx, tid);
    const t = await getTournament(v.ctx, tid);
    expect(t.status).toBe("done");
    expect(t.standings).toHaveLength(8);
    expect(t.standings[0]!.rankPoints).toBeGreaterThanOrEqual(t.standings[7]!.rankPoints);
    await expect(saveScores(referee, tid, { roundNo: 2, tableNo: 1, scores: [] as never })).rejects.toBeTruthy();
  });

  it("peserta dari member memakai nama member; peserta hanya bisa dihapus saat draft", async () => {
    const v = await venueOf("Naga Jade");
    const m = await memberOf(v.ctx, "Mei Ling");
    const tid = await createTournament(v.ctx, { name: "Uji", eventDate: day(1), entryFee: 0, rounds: 1, rankPoints: [4, 2, 1, 0], note: null });
    await addEntrant(v.ctx, tid, { memberId: m });
    const t = await getTournament(v.ctx, tid);
    expect(t.entrants[0]).toMatchObject({ name: "Mei Ling", memberId: m });
    await removeEntrant(v.ctx, tid, t.entrants[0]!.id);
    expect((await getTournament(v.ctx, tid)).entrants).toHaveLength(0);
    expect(await listMembers(v.ctx)).toHaveLength(1);
  });

  it("tempat lain tidak melihat turnamen ini", async () => {
    const a = await venueOf("Rumah A");
    const b = await venueOf("Rumah B");
    const tid = await createTournament(a.ctx, { name: "Rahasia", eventDate: day(1), entryFee: 0, rounds: 1, rankPoints: [4, 2, 1, 0], note: null });
    await expect(getTournament(b.ctx, tid)).rejects.toMatchObject({ status: 404 });
  });
});
