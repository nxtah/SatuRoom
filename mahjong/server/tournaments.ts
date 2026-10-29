import "server-only";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import { computeStandings, type SeatRow, type Standing } from "@/lib/billing";
import type { EntrantInput, ScoresInput, TournamentInput } from "@/lib/schemas";
import { inVenue, requirePermission, type VenueContext } from "./context";
import { AppError, notFound } from "./errors";

type Tx = Parameters<Parameters<typeof inVenue>[1]>[0];

export interface TournamentRow {
  id: string;
  name: string;
  eventDate: string;
  entryFee: number;
  rounds: number;
  status: "draft" | "running" | "done";
  players: number;
  paid: number;
  roundsPlayed: number;
}

export function listTournaments(ctx: VenueContext): Promise<TournamentRow[]> {
  requirePermission(ctx, "tournaments.read");
  return inVenue(ctx, async (tx) =>
    (await tx.execute(sql`
      SELECT t.id, t.name, to_char(t.event_date, 'YYYY-MM-DD') AS "eventDate", t.entry_fee AS "entryFee", t.rounds, t.status,
        (SELECT count(*) FROM mahjong.tournament_players p WHERE p.tournament_id = t.id)::int AS players,
        (SELECT count(*) FROM mahjong.tournament_players p WHERE p.tournament_id = t.id AND p.paid)::int AS paid,
        (SELECT coalesce(max(round_no), 0) FROM mahjong.tournament_seats s WHERE s.tournament_id = t.id)::int AS "roundsPlayed"
      FROM mahjong.tournaments t ORDER BY t.event_date DESC, t.created_at DESC LIMIT 100`)) as unknown as TournamentRow[],
  );
}

export async function createTournament(ctx: VenueContext, input: z.infer<typeof TournamentInput>): Promise<string> {
  requirePermission(ctx, "tournaments.manage");
  return inVenue(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`
      INSERT INTO mahjong.tournaments (business_id, name, event_date, entry_fee, rounds, rank_points, note, created_by)
      VALUES (${ctx.businessId}::uuid, ${input.name}, ${input.eventDate}::date, ${input.entryFee}, ${input.rounds}, ${`{${input.rankPoints.join(",")}}`}::smallint[], ${input.note ?? null}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "tournament.created", targetType: "tournament", targetId: row!.id });
    return row!.id;
  });
}

export interface Entrant {
  id: string;
  name: string;
  memberId: string | null;
  paid: boolean;
}

export interface RoundTable {
  tableNo: number;
  seats: { seat: number; playerId: string; name: string; score: number | null }[];
  complete: boolean;
}

export interface TournamentDetail extends Omit<TournamentRow, "players" | "paid" | "roundsPlayed"> {
  rankPoints: number[];
  note: string | null;
  entrants: Entrant[];
  rounds_: { roundNo: number; tables: RoundTable[]; complete: boolean }[];
  standings: (Standing & { name: string })[];
  canManage: boolean;
  canScore: boolean;
}

export function getTournament(ctx: VenueContext, id: string): Promise<TournamentDetail> {
  requirePermission(ctx, "tournaments.read");
  return inVenue(ctx, async (tx) => {
    const [t] = (await tx.execute(sql`
      SELECT id, name, to_char(event_date, 'YYYY-MM-DD') AS "eventDate", entry_fee AS "entryFee", rounds, status, note, rank_points AS "rankPoints"
      FROM mahjong.tournaments WHERE id = ${id}::uuid`)) as unknown as (Omit<TournamentDetail, "entrants" | "rounds_" | "standings" | "canManage" | "canScore"> & { rankPoints: number[] | string })[];
    if (!t) throw notFound("Turnamen");
    const rankPoints = Array.isArray(t.rankPoints) ? t.rankPoints.map(Number) : String(t.rankPoints).replace(/[{}]/g, "").split(",").map(Number);
    const entrants = (await tx.execute(sql`SELECT id, name, member_id AS "memberId", paid FROM mahjong.tournament_players WHERE tournament_id = ${id}::uuid ORDER BY created_at`)) as unknown as Entrant[];
    const seats = (await tx.execute(sql`
      SELECT s.round_no AS round, s.table_no AS "table", s.seat_no AS seat, s.player_id AS "playerId", s.score
      FROM mahjong.tournament_seats s WHERE s.tournament_id = ${id}::uuid ORDER BY s.round_no, s.table_no, s.seat_no`)) as unknown as SeatRow[];
    const names = new Map(entrants.map((e) => [e.id, e.name]));
    const roundNos = [...new Set(seats.map((s) => s.round))];
    const rounds_ = roundNos.map((roundNo) => {
      const inRound = seats.filter((s) => s.round === roundNo);
      const tableNos = [...new Set(inRound.map((s) => s.table))];
      const tables = tableNos.map((tableNo) => {
        const mine = inRound.filter((s) => s.table === tableNo);
        return { tableNo, seats: mine.map((s) => ({ seat: s.seat, playerId: s.playerId, name: names.get(s.playerId) ?? "?", score: s.score })), complete: mine.every((s) => s.score !== null) };
      });
      return { roundNo, tables, complete: tables.every((x) => x.complete) };
    });
    const standings = computeStandings(entrants.map((e) => e.id), seats, rankPoints).map((s) => ({ ...s, name: names.get(s.playerId) ?? "?" }));
    return { ...t, rankPoints, entrants, rounds_, standings, canManage: ctx.can("tournaments.manage"), canScore: ctx.can("tournaments.score") };
  });
}

async function lockTournament(tx: Tx, id: string) {
  const [t] = (await tx.execute(sql`SELECT id, status, rounds FROM mahjong.tournaments WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { id: string; status: "draft" | "running" | "done"; rounds: number }[];
  if (!t) throw notFound("Turnamen");
  return t;
}

/** Peserta dari member atau nama bebas. Pendaftaran ditutup begitu babak pertama dibuat. */
export async function addEntrant(ctx: VenueContext, tournamentId: string, input: z.infer<typeof EntrantInput>): Promise<void> {
  requirePermission(ctx, "tournaments.manage");
  await inVenue(ctx, async (tx) => {
    const t = await lockTournament(tx, tournamentId);
    if (t.status !== "draft") throw new AppError(409, "started", "Turnamen sudah berjalan, peserta tidak bisa ditambah.");
    let name = input.name ?? "";
    if (input.memberId) {
      const [m] = (await tx.execute(sql`SELECT full_name AS n FROM mahjong.members WHERE id = ${input.memberId}::uuid AND archived_at IS NULL`)) as unknown as { n: string }[];
      if (!m) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { memberId: "Member tidak ditemukan." });
      name = m.n;
    }
    const [dup] = (await tx.execute(sql`SELECT 1 AS x FROM mahjong.tournament_players WHERE tournament_id = ${tournamentId}::uuid AND lower(name) = lower(${name})`)) as unknown as unknown[];
    if (dup) throw new AppError(409, "duplicate", "Peserta ini sudah terdaftar.", { name: "Peserta ini sudah terdaftar." });
    await tx.execute(sql`
      INSERT INTO mahjong.tournament_players (business_id, tournament_id, member_id, name)
      VALUES (${ctx.businessId}::uuid, ${tournamentId}::uuid, ${input.memberId ?? null}::uuid, ${name})`);
  });
}

export async function removeEntrant(ctx: VenueContext, tournamentId: string, playerId: string): Promise<void> {
  requirePermission(ctx, "tournaments.manage");
  await inVenue(ctx, async (tx) => {
    const t = await lockTournament(tx, tournamentId);
    if (t.status !== "draft") throw new AppError(409, "started", "Turnamen sudah berjalan, peserta tidak bisa dihapus.");
    await tx.execute(sql`DELETE FROM mahjong.tournament_players WHERE id = ${playerId}::uuid AND tournament_id = ${tournamentId}::uuid`);
  });
}

export async function setEntrantPaid(ctx: VenueContext, tournamentId: string, playerId: string, paid: boolean): Promise<void> {
  requirePermission(ctx, "tournaments.manage");
  await inVenue(ctx, async (tx) => {
    const done = (await tx.execute(sql`UPDATE mahjong.tournament_players SET paid = ${paid} WHERE id = ${playerId}::uuid AND tournament_id = ${tournamentId}::uuid RETURNING id`)) as unknown as unknown[];
    if (!done.length) throw notFound("Peserta");
  });
}

/** Ukuran meja untuk n peserta: meja berempat sebanyak mungkin, sisanya meja bertiga. Kosong bila mustahil. */
export function tableSizes(n: number): number[] | null {
  if (n < 4) return null;
  const threes = (3 * (n % 4)) % 4; // n = 4a + 3b dengan b sekecil mungkin
  const fours = (n - 3 * threes) / 4;
  if (fours < 0) return null;
  return [...Array(fours).fill(4), ...Array(threes).fill(3)];
}

/** Mengacak peserta ke meja dengan meminimalkan pertemuan ulang antar peserta yang sama. */
export function seatPlayers(ids: string[], met: Map<string, number>, sizes: number[], rand: () => number = Math.random): string[][] {
  let best: string[][] = [];
  let bestCost = Infinity;
  for (let trial = 0; trial < 300; trial++) {
    const order = [...ids];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    const tables: string[][] = [];
    let at = 0;
    for (const size of sizes) {
      tables.push(order.slice(at, at + size));
      at += size;
    }
    let cost = 0;
    for (const tb of tables) for (let a = 0; a < tb.length; a++) for (let b = a + 1; b < tb.length; b++) cost += met.get([tb[a], tb[b]].sort().join("|")) ?? 0;
    if (cost < bestCost) {
      bestCost = cost;
      best = tables;
      if (cost === 0) break;
    }
  }
  return best;
}

/** Membuat babak berikutnya. Babak sebelumnya harus sudah lengkap skornya. */
export async function generateRound(ctx: VenueContext, tournamentId: string): Promise<number> {
  requirePermission(ctx, "tournaments.manage");
  return inVenue(ctx, async (tx) => {
    const t = await lockTournament(tx, tournamentId);
    if (t.status === "done") throw new AppError(409, "done", "Turnamen ini sudah selesai.");
    const players = (await tx.execute(sql`SELECT id FROM mahjong.tournament_players WHERE tournament_id = ${tournamentId}::uuid`)) as unknown as { id: string }[];
    const sizes = tableSizes(players.length);
    if (!sizes) throw new AppError(409, "players", players.length < 4 ? "Butuh minimal 4 peserta." : `Dengan ${players.length} peserta meja tidak bisa dibagi rata. Tambah atau kurangi peserta.`);
    const seats = (await tx.execute(sql`SELECT round_no AS round, table_no AS "table", seat_no AS seat, player_id AS "playerId", score FROM mahjong.tournament_seats WHERE tournament_id = ${tournamentId}::uuid`)) as unknown as SeatRow[];
    const last = seats.reduce((n, s) => Math.max(n, s.round), 0);
    if (last >= t.rounds) throw new AppError(409, "rounds", `Semua ${t.rounds} babak sudah dibuat.`);
    if (seats.some((s) => s.round === last && s.score === null)) throw new AppError(409, "unscored", `Isi skor semua meja babak ${last} dulu.`);
    const met = new Map<string, number>();
    const byTable = new Map<string, string[]>();
    for (const s of seats) byTable.set(`${s.round}:${s.table}`, [...(byTable.get(`${s.round}:${s.table}`) ?? []), s.playerId]);
    for (const tb of byTable.values()) for (let a = 0; a < tb.length; a++) for (let b = a + 1; b < tb.length; b++) {
      const key = [tb[a], tb[b]].sort().join("|");
      met.set(key, (met.get(key) ?? 0) + 1);
    }
    const layout = seatPlayers(players.map((p) => p.id), met, sizes);
    const round = last + 1;
    for (const [ti, table] of layout.entries()) {
      for (const [si, playerId] of table.entries()) {
        await tx.execute(sql`
          INSERT INTO mahjong.tournament_seats (business_id, tournament_id, round_no, table_no, seat_no, player_id)
          VALUES (${ctx.businessId}::uuid, ${tournamentId}::uuid, ${round}, ${ti + 1}, ${si + 1}, ${playerId}::uuid)`);
      }
    }
    if (t.status === "draft") await tx.execute(sql`UPDATE mahjong.tournaments SET status = 'running' WHERE id = ${tournamentId}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "tournament.round", targetType: "tournament", targetId: tournamentId, meta: { round } });
    return round;
  });
}

/** Mengisi skor satu meja pada satu babak. Wasit boleh mengisi; skor bisa diperbaiki selama turnamen belum selesai. */
export async function saveScores(ctx: VenueContext, tournamentId: string, input: z.infer<typeof ScoresInput>): Promise<void> {
  requirePermission(ctx, "tournaments.score");
  await inVenue(ctx, async (tx) => {
    const t = await lockTournament(tx, tournamentId);
    if (t.status !== "running") throw new AppError(409, "not_running", t.status === "done" ? "Turnamen ini sudah selesai." : "Buat babak pertama dulu.");
    const seats = (await tx.execute(sql`
      SELECT player_id AS "playerId" FROM mahjong.tournament_seats WHERE tournament_id = ${tournamentId}::uuid AND round_no = ${input.roundNo} AND table_no = ${input.tableNo}`)) as unknown as { playerId: string }[];
    if (!seats.length) throw notFound("Meja turnamen");
    const allowed = new Set(seats.map((s) => s.playerId));
    if (input.scores.length !== allowed.size || input.scores.some((s) => !allowed.has(s.playerId))) throw new AppError(422, "invalid", "Skor harus untuk semua pemain di meja ini.");
    for (const s of input.scores) {
      await tx.execute(sql`UPDATE mahjong.tournament_seats SET score = ${s.score} WHERE tournament_id = ${tournamentId}::uuid AND round_no = ${input.roundNo} AND player_id = ${s.playerId}::uuid`);
    }
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "tournament.scored", targetType: "tournament", targetId: tournamentId, meta: { round: input.roundNo, table: input.tableNo } });
  });
}

/** Menutup turnamen setelah semua babak dibuat dan seluruh skor terisi. */
export async function finishTournament(ctx: VenueContext, tournamentId: string): Promise<void> {
  requirePermission(ctx, "tournaments.manage");
  await inVenue(ctx, async (tx) => {
    const t = await lockTournament(tx, tournamentId);
    if (t.status !== "running") throw new AppError(409, "not_running", "Turnamen belum berjalan atau sudah selesai.");
    const [r] = (await tx.execute(sql`
      SELECT coalesce(max(round_no), 0)::int AS last, count(*) FILTER (WHERE score IS NULL)::int AS missing FROM mahjong.tournament_seats WHERE tournament_id = ${tournamentId}::uuid`)) as unknown as { last: number; missing: number }[];
    if (r!.last < t.rounds) throw new AppError(409, "rounds", `Baru ${r!.last} dari ${t.rounds} babak. Selesaikan semua babak dulu.`);
    if (r!.missing) throw new AppError(409, "unscored", "Masih ada skor yang kosong.");
    await tx.execute(sql`UPDATE mahjong.tournaments SET status = 'done' WHERE id = ${tournamentId}::uuid`);
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "tournament.finished", targetType: "tournament", targetId: tournamentId });
  });
}
