import { describe, expect, it } from "vitest";
import { billableMinutes, computeBill, computeStandings, discountFor } from "@/lib/billing";
import { seatPlayers, tableSizes } from "@/server/tournaments";

const t0 = "2026-01-01T10:00:00Z";
const at = (min: number) => new Date(new Date(t0).getTime() + min * 60_000);

describe("tagihan meja", () => {
  it("membulatkan ke atas per langkah dan menghormati minimum", () => {
    expect(billableMinutes(10, 30, 60)).toBe(60);
    expect(billableMinutes(61, 30, 60)).toBe(90);
    expect(billableMinutes(120, 30, 60)).toBe(120);
    expect(billableMinutes(5, 15, 0)).toBe(15);
  });
  it("menghitung biaya, diskon hanya untuk waktu, dan total", () => {
    const b = computeBill({ rate: 40_000, step: 30, minMinutes: 60, startedAt: t0, endedAt: at(95), fnb: 25_000, discountPct: 10 });
    expect(b.billableMin).toBe(120);
    expect(b.timeCharge).toBe(80_000);
    expect(b.discount).toBe(8_000);
    expect(b.total).toBe(80_000 - 8_000 + 25_000);
  });
  it("diskon per tingkat member", () => {
    const s = { discountSilver: 5, discountGold: 15 };
    expect([discountFor("regular", s), discountFor("silver", s), discountFor("gold", s)]).toEqual([0, 5, 15]);
  });
});

describe("turnamen: murni", () => {
  it("meja dibagi 4 dan 3 sesuai jumlah peserta", () => {
    expect(tableSizes(8)).toEqual([4, 4]);
    expect(tableSizes(7)).toEqual([4, 3]);
    expect(tableSizes(6)).toEqual([3, 3]);
    expect(tableSizes(9)).toEqual([3, 3, 3]);
    expect(tableSizes(10)).toEqual([4, 3, 3]);
    expect(tableSizes(5)).toBeNull();
    expect(tableSizes(3)).toBeNull();
  });
  it("pengacakan menghindari pertemuan ulang bila bisa", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const met = new Map<string, number>([["a|b", 1], ["a|c", 1], ["a|d", 1], ["b|c", 1], ["b|d", 1], ["c|d", 1]]);
    const layout = seatPlayers(ids, met, [4, 4]);
    expect(layout.flat().sort()).toEqual(ids);
    for (const t of layout) expect(["a", "b", "c", "d"].filter((x) => t.includes(x)).length).toBeLessThan(4);
  });
  it("klasemen: poin peringkat lalu total skor; meja belum lengkap tidak dihitung", () => {
    const seats = [
      { round: 1, table: 1, seat: 1, playerId: "a", score: 30000 },
      { round: 1, table: 1, seat: 2, playerId: "b", score: 25000 },
      { round: 1, table: 1, seat: 3, playerId: "c", score: 25000 },
      { round: 1, table: 1, seat: 4, playerId: "d", score: 20000 },
      { round: 2, table: 1, seat: 1, playerId: "a", score: null },
      { round: 2, table: 1, seat: 2, playerId: "b", score: 1 },
      { round: 2, table: 1, seat: 3, playerId: "c", score: 1 },
      { round: 2, table: 1, seat: 4, playerId: "d", score: 1 },
    ];
    const s = computeStandings(["a", "b", "c", "d"], seats, [4, 2, 1, 0]);
    expect(s.map((x) => [x.playerId, x.rankPoints, x.place])).toEqual([["a", 4, 1], ["b", 2, 2], ["c", 1, 3], ["d", 0, 4]]);
  });
});
