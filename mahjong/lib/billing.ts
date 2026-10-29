/** Hitung tagihan meja. Dipakai server (saat menutup) dan browser (pratinjau berjalan), jadi harus murni. */

export const ROUND_TO = 500;

export interface BillInput {
  /** Tarif per jam dalam rupiah. */
  rate: number;
  /** Pembulatan ke atas per kelipatan menit ini. */
  step: number;
  /** Tagihan minimum dalam menit. */
  minMinutes: number;
  startedAt: Date | string;
  endedAt: Date | string;
  /** Total makanan dan minuman (sudah dikurangi pesanan batal). */
  fnb: number;
  /** Diskon member dalam persen; hanya untuk biaya waktu. */
  discountPct: number;
}

export interface Bill {
  elapsedMin: number;
  billableMin: number;
  timeCharge: number;
  discount: number;
  fnb: number;
  total: number;
}

export const billableMinutes = (elapsedMin: number, step: number, minMinutes: number) =>
  Math.max(minMinutes, Math.ceil(Math.max(0, elapsedMin) / step) * step);

export function computeBill(i: BillInput): Bill {
  const elapsedMin = Math.max(0, (new Date(i.endedAt).getTime() - new Date(i.startedAt).getTime()) / 60_000);
  const billableMin = billableMinutes(elapsedMin, i.step, i.minMinutes);
  const timeCharge = Math.round((i.rate * billableMin) / 60 / ROUND_TO) * ROUND_TO;
  const discount = Math.round((timeCharge * i.discountPct) / 100 / ROUND_TO) * ROUND_TO;
  return { elapsedMin, billableMin, timeCharge, discount, fnb: i.fnb, total: timeCharge - discount + i.fnb };
}

export const TIER_LABEL = { regular: "Reguler", silver: "Silver", gold: "Gold" } as const;
export type Tier = keyof typeof TIER_LABEL;

export const discountFor = (tier: Tier, s: { discountSilver: number; discountGold: number }) =>
  tier === "gold" ? s.discountGold : tier === "silver" ? s.discountSilver : 0;

export const METHOD_LABEL = { cash: "Tunai", qris: "QRIS", transfer: "Transfer", balance: "Saldo member" } as const;
export type Method = keyof typeof METHOD_LABEL;

/** Susunan klasemen turnamen: poin peringkat lalu total skor. Murni agar bisa dites. */
export interface SeatRow { round: number; table: number; seat: number; playerId: string; score: number | null }
export interface Standing { playerId: string; rankPoints: number; totalScore: number; rounds: number; firsts: number; place: number }

export function computeStandings(playerIds: string[], seats: SeatRow[], rankPoints: number[]): Standing[] {
  const acc = new Map(playerIds.map((id) => [id, { playerId: id, rankPoints: 0, totalScore: 0, rounds: 0, firsts: 0, place: 0 }]));
  const groups = new Map<string, SeatRow[]>();
  for (const s of seats) groups.set(`${s.round}:${s.table}`, [...(groups.get(`${s.round}:${s.table}`) ?? []), s]);
  for (const g of groups.values()) {
    // Meja baru dihitung bila semua kursinya sudah berskor.
    if (g.some((s) => s.score === null)) continue;
    const ranked = [...g].sort((a, b) => b.score! - a.score! || a.seat - b.seat);
    ranked.forEach((s, i) => {
      const row = acc.get(s.playerId);
      if (!row) return;
      row.rankPoints += rankPoints[i] ?? 0;
      row.totalScore += s.score!;
      row.rounds += 1;
      if (i === 0) row.firsts += 1;
    });
  }
  const list = [...acc.values()].sort((a, b) => b.rankPoints - a.rankPoints || b.totalScore - a.totalScore || b.firsts - a.firsts);
  list.forEach((r, i) => {
    const prev = list[i - 1];
    r.place = prev && prev.rankPoints === r.rankPoints && prev.totalScore === r.totalScore ? prev.place : i + 1;
  });
  return list;
}
export const KIND_LABEL = { auto: "Otomatis", manual: "Manual", vip: "VIP" } as const;
