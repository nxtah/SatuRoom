import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { accountIdOf, postJournal, reverseSource } from "./ledger";
import { accountsOf, notify } from "./notifications";
import { visiblePlayerIds } from "./players";
import { academyToday } from "./schedule";

const empty = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal.");

export const EventInput = z.object({
  kind: z.enum(["event", "tournament"]).default("event"),
  title: z.string().trim().min(3, "Isi nama event.").max(100),
  description: z.preprocess(empty, z.string().trim().max(1500).nullable()).optional(),
  place: z.preprocess(empty, z.string().trim().max(120).nullable()).optional(),
  startsOn: ymd,
  endsOn: ymd,
  fee: z.coerce.number().int().min(0).max(100_000_000).default(0),
  capacity: z.preprocess(empty, z.coerce.number().int().min(1).max(5000).nullable()).optional(),
  parentSignup: z.boolean().default(true),
});
export type EventInputT = z.infer<typeof EventInput>;

export interface EventRow {
  id: string;
  kind: "event" | "tournament";
  title: string;
  description: string | null;
  place: string | null;
  startsOn: string;
  endsOn: string;
  fee: number;
  capacity: number | null;
  parentSignup: boolean;
  status: "draft" | "open" | "closed" | "done" | "cancelled";
  participants: number;
  paid: number;
}

export interface Participant {
  id: string;
  playerId: string;
  fullName: string;
  status: "registered" | "paid" | "cancelled";
  fee: number;
  channel: "staff" | "parent";
  result: string | null;
  rank: number | null;
}

export interface Standing {
  teamId: string;
  name: string;
  group: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Fixture {
  id: string;
  homeId: string;
  awayId: string;
  home: string;
  away: string;
  round: string | null;
  playedOn: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

const who = (ctx: AcademyContext) => ({ businessId: ctx.businessId, userId: ctx.userId });

async function gate(ctx: AcademyContext, manage = true) {
  requireModule(ctx, "events");
  if (manage) requirePermission(ctx, "events.manage");
}

function audit(ctx: AcademyContext, tx: Tx, action: string, targetId: string, meta: Record<string, unknown> = {}) {
  return tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action, targetType: "event", targetId, meta });
}

const EVENT_COLS = sql`
  e.id, e.kind, e.title, e.description, e.place, to_char(e.starts_on, 'YYYY-MM-DD') AS "startsOn", to_char(e.ends_on, 'YYYY-MM-DD') AS "endsOn",
  e.fee, e.capacity, e.parent_signup AS "parentSignup", e.status,
  (SELECT count(*) FROM bola.event_participants p WHERE p.event_id = e.id AND p.status <> 'cancelled')::int AS participants,
  (SELECT count(*) FROM bola.event_participants p WHERE p.event_id = e.id AND p.status = 'paid')::int AS paid`;

export async function listEvents(ctx: AcademyContext): Promise<EventRow[]> {
  await gate(ctx, false);
  return inAcademy(ctx, async (tx) =>
    (await tx.execute(sql`SELECT ${EVENT_COLS} FROM bola.events e ORDER BY e.starts_on DESC LIMIT 100`)) as unknown as EventRow[],
  );
}

function checkDates(input: EventInputT) {
  if (input.endsOn < input.startsOn) throw new AppError(422, "invalid", "Periksa lagi isian yang ditandai.", { endsOn: "Tanggal selesai sebelum tanggal mulai." });
}

export async function createEvent(ctx: AcademyContext, input: EventInputT): Promise<string> {
  await gate(ctx);
  checkDates(input);
  return inAcademy(ctx, async (tx) => {
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.events (business_id, kind, title, description, place, starts_on, ends_on, fee, capacity, parent_signup, created_by)
      VALUES (${ctx.businessId}::uuid, ${input.kind}::bola.event_kind, ${input.title}, ${input.description ?? null}, ${input.place ?? null},
              ${input.startsOn}::date, ${input.endsOn}::date, ${input.fee}, ${input.capacity ?? null}, ${input.parentSignup}, ${ctx.userId}::uuid)
      RETURNING id`)) as unknown as { id: string }[];
    await audit(ctx, tx, "event.created", row!.id, { title: input.title });
    return row!.id;
  });
}

export async function updateEvent(ctx: AcademyContext, id: string, input: EventInputT): Promise<void> {
  await gate(ctx);
  checkDates(input);
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE bola.events SET kind = ${input.kind}::bola.event_kind, title = ${input.title}, description = ${input.description ?? null},
        place = ${input.place ?? null}, starts_on = ${input.startsOn}::date, ends_on = ${input.endsOn}::date, fee = ${input.fee},
        capacity = ${input.capacity ?? null}, parent_signup = ${input.parentSignup}
      WHERE id = ${id}::uuid RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Event");
    await audit(ctx, tx, "event.updated", id);
  });
}

/** draft → open (diumumkan ke orang tua) → closed → done; atau cancelled. */
export async function setEventStatus(ctx: AcademyContext, id: string, status: EventRow["status"]): Promise<void> {
  await gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [e] = (await tx.execute(sql`SELECT status, title FROM bola.events WHERE id = ${id}::uuid FOR UPDATE`)) as unknown as { status: string; title: string }[];
    if (!e) throw notFound("Event");
    if (e.status === "cancelled" || (e.status === "done" && status !== "done")) throw new AppError(409, "final", "Event ini sudah selesai atau dibatalkan.");
    if (status === "cancelled") {
      const [paid] = (await tx.execute(sql`SELECT count(*)::int AS n FROM bola.event_participants WHERE event_id = ${id}::uuid AND status = 'paid'`)) as unknown as { n: number }[];
      if (paid!.n) throw new AppError(409, "has_paid", "Ada peserta yang sudah membayar. Batalkan pembayaran mereka dulu.");
    }
    await tx.execute(sql`UPDATE bola.events SET status = ${status}::bola.event_status WHERE id = ${id}::uuid`);
    if (status === "open" && e.status === "draft") {
      const all = (await tx.execute(sql`SELECT DISTINCT user_id AS u FROM bola.player_accounts`)) as unknown as { u: string }[];
      await notify(tx, ctx.businessId, all.map((r) => r.u), { title: `Event baru: ${e.title}`, body: "Lihat detail dan daftarkan anak Anda.", href: "/saya/event" });
    }
    if (status === "cancelled") {
      const ps = (await tx.execute(sql`SELECT player_id AS p FROM bola.event_participants WHERE event_id = ${id}::uuid AND status <> 'cancelled'`)) as unknown as { p: string }[];
      await notify(tx, ctx.businessId, await accountsOf(tx, ps.map((r) => r.p)), { title: `Event dibatalkan: ${e.title}`, href: "/saya/event" });
    }
    await audit(ctx, tx, `event.${status}`, id);
  });
}

async function eventFor(tx: Tx, id: string) {
  const [e] = (await tx.execute(sql`SELECT ${EVENT_COLS} FROM bola.events e WHERE e.id = ${id}::uuid`)) as unknown as EventRow[];
  if (!e) throw notFound("Event");
  return e;
}

export async function getEvent(ctx: AcademyContext, id: string) {
  await gate(ctx, false);
  return inAcademy(ctx, async (tx) => {
    const event = await eventFor(tx, id);
    const scope = await visiblePlayerIds(ctx, tx);
    const participants = ((await tx.execute(sql`
      SELECT p.id, p.player_id AS "playerId", pl.full_name AS "fullName", p.status, p.fee, p.channel, p.result, p.rank
      FROM bola.event_participants p JOIN bola.players pl ON pl.id = p.player_id
      WHERE p.event_id = ${id}::uuid ORDER BY p.rank NULLS LAST, lower(pl.full_name)`)) as unknown as Participant[]).filter(
      (p) => !scope || scope.includes(p.playerId),
    );
    return { event, participants, ...(await tournamentOf(tx, id)) };
  });
}

/** Daftarkan pemain (oleh staf atau orang tua). Biaya dikunci saat mendaftar. */
async function registerIn(tx: Tx, businessId: string, userId: string, eventId: string, playerId: string, channel: "staff" | "parent"): Promise<string> {
  const [e] = (await tx.execute(sql`
    SELECT status, fee, capacity, parent_signup AS "parentSignup", title,
      (SELECT count(*) FROM bola.event_participants p WHERE p.event_id = e.id AND p.status <> 'cancelled')::int AS n
    FROM bola.events e WHERE e.id = ${eventId}::uuid FOR UPDATE`)) as unknown as { status: string; fee: number; capacity: number | null; parentSignup: boolean; title: string; n: number }[];
  if (!e) throw notFound("Event");
  if (e.status !== "open" && !(channel === "staff" && e.status === "draft")) throw new AppError(409, "closed", "Pendaftaran event ini sudah ditutup.");
  if (channel === "parent" && !e.parentSignup) throw new AppError(403, "forbidden", "Pendaftaran event ini lewat staf akademi.");
  if (e.capacity && e.n >= e.capacity) throw new AppError(409, "full", "Kuota event sudah penuh.");
  const [row] = (await tx.execute(sql`
    INSERT INTO bola.event_participants (business_id, event_id, player_id, fee, channel, registered_by)
    VALUES (${businessId}::uuid, ${eventId}::uuid, ${playerId}::uuid, ${e.fee}, ${channel}, ${userId}::uuid)
    ON CONFLICT (event_id, player_id) DO UPDATE SET status = 'registered', fee = excluded.fee, channel = excluded.channel,
      registered_by = excluded.registered_by, paid_on = NULL, method = NULL
      WHERE bola.event_participants.status = 'cancelled'
    RETURNING id`)) as unknown as { id: string }[];
  if (!row) throw new AppError(409, "registered", "Pemain ini sudah terdaftar.");
  await tx.insert(auditEvents).values({ businessId, actorUserId: userId, action: `event.registered_${channel}`, targetType: "event", targetId: eventId, meta: { playerId } });
  return row.id;
}

export async function registerPlayers(ctx: AcademyContext, eventId: string, playerIds: string[]): Promise<number> {
  await gate(ctx);
  return inAcademy(ctx, async (tx) => {
    const scope = await visiblePlayerIds(ctx, tx);
    let n = 0;
    for (const pid of playerIds) {
      if (scope && !scope.includes(pid)) throw notFound("Pemain");
      await registerIn(tx, ctx.businessId, ctx.userId, eventId, pid, "staff");
      n++;
    }
    return n;
  });
}

export { registerIn };

/** Pembayaran biaya event (tunai di akademi): Kas/Bank, Pendapatan event. */
export async function payParticipant(ctx: AcademyContext, participantId: string, method: "cash" | "transfer" | "other", paidOn: string): Promise<void> {
  await gate(ctx);
  requirePermission(ctx, "billing.manage");
  await inAcademy(ctx, async (tx) => {
    const [p] = (await tx.execute(sql`
      SELECT p.status, p.fee, p.event_id AS "eventId", pl.full_name AS name, e.title
      FROM bola.event_participants p JOIN bola.players pl ON pl.id = p.player_id JOIN bola.events e ON e.id = p.event_id
      WHERE p.id = ${participantId}::uuid FOR UPDATE OF p`)) as unknown as { status: string; fee: number; eventId: string; name: string; title: string }[];
    if (!p) throw notFound("Peserta");
    if (p.status !== "registered") throw new AppError(409, "not_registered", "Peserta ini sudah membayar atau batal.");
    if (paidOn > (await academyToday(tx))) throw new AppError(422, "invalid", "Tanggal bayar tidak boleh di masa depan.");
    if (p.fee > 0) {
      await postJournal(tx, who(ctx), {
        date: paidOn,
        memo: `Biaya ${p.title} - ${p.name}`,
        source: "event",
        sourceId: participantId,
        lines: [
          { account: await accountIdOf(tx, method === "transfer" ? "bank" : "cash"), debit: p.fee },
          { account: { key: "event_income" }, credit: p.fee },
        ],
      });
    }
    await tx.execute(sql`
      UPDATE bola.event_participants SET status = 'paid', paid_on = ${paidOn}::date, method = ${method}::bola.payment_method WHERE id = ${participantId}::uuid`);
    await audit(ctx, tx, "event.participant_paid", p.eventId, { participantId, fee: p.fee });
  });
}

/** Batalkan peserta. Bila sudah membayar, jurnal pembayaran dibalik (uang dikembalikan). */
export async function cancelParticipant(ctx: AcademyContext, participantId: string): Promise<void> {
  await gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [p] = (await tx.execute(sql`SELECT status, event_id AS "eventId" FROM bola.event_participants WHERE id = ${participantId}::uuid FOR UPDATE`)) as unknown as { status: string; eventId: string }[];
    if (!p) throw notFound("Peserta");
    if (p.status === "cancelled") return;
    if (p.status === "paid") {
      requirePermission(ctx, "billing.manage");
      await reverseSource(tx, who(ctx), "event", participantId, await academyToday(tx));
    }
    await tx.execute(sql`UPDATE bola.event_participants SET status = 'cancelled', paid_on = NULL, method = NULL WHERE id = ${participantId}::uuid`);
    await audit(ctx, tx, "event.participant_cancelled", p.eventId, { participantId, refunded: p.status === "paid" });
  });
}

export async function setResult(ctx: AcademyContext, participantId: string, rank: number | null, result: string | null): Promise<void> {
  await gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE bola.event_participants SET rank = ${rank}, result = ${result} WHERE id = ${participantId}::uuid AND status <> 'cancelled' RETURNING player_id AS p`)) as unknown as { p: string }[];
    if (!rows.length) throw notFound("Peserta");
  });
}

// ---------- Turnamen: tim, pertandingan, klasemen ----------

async function tournamentOf(tx: Tx, eventId: string): Promise<{ teams: { id: string; name: string; group: string | null; teamId: string | null }[]; fixtures: Fixture[]; standings: Standing[] }> {
  const teams = (await tx.execute(sql`
    SELECT id, name, group_name AS "group", team_id AS "teamId" FROM bola.event_teams WHERE event_id = ${eventId}::uuid ORDER BY group_name NULLS FIRST, lower(name)`)) as unknown as {
    id: string; name: string; group: string | null; teamId: string | null;
  }[];
  const fixtures = (await tx.execute(sql`
    SELECT f.id, f.home_id AS "homeId", f.away_id AS "awayId", h.name AS home, a.name AS away, f.round,
           to_char(f.played_on, 'YYYY-MM-DD') AS "playedOn", f.home_score AS "homeScore", f.away_score AS "awayScore"
    FROM bola.event_fixtures f JOIN bola.event_teams h ON h.id = f.home_id JOIN bola.event_teams a ON a.id = f.away_id
    WHERE f.event_id = ${eventId}::uuid ORDER BY f.played_on NULLS LAST, f.created_at`)) as unknown as Fixture[];
  return { teams, fixtures, standings: standingsOf(teams, fixtures) };
}

/** Klasemen: menang 3, seri 1, kalah 0; urut poin, selisih gol, gol memasukkan, nama. */
export function standingsOf(teams: { id: string; name: string; group: string | null }[], fixtures: Fixture[]): Standing[] {
  const t = new Map<string, Standing>(
    teams.map((x) => [x.id, { teamId: x.id, name: x.name, group: x.group, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]),
  );
  for (const f of fixtures) {
    if (f.homeScore === null || f.awayScore === null) continue;
    const h = t.get(f.homeId);
    const a = t.get(f.awayId);
    if (!h || !a) continue;
    h.played++; a.played++;
    h.goalsFor += f.homeScore; h.goalsAgainst += f.awayScore;
    a.goalsFor += f.awayScore; a.goalsAgainst += f.homeScore;
    if (f.homeScore > f.awayScore) { h.won++; a.lost++; h.points += 3; }
    else if (f.homeScore < f.awayScore) { a.won++; h.lost++; a.points += 3; }
    else { h.drawn++; a.drawn++; h.points++; a.points++; }
  }
  return [...t.values()].sort(
    (x, y) =>
      (x.group ?? "").localeCompare(y.group ?? "") ||
      y.points - x.points ||
      y.goalsFor - y.goalsAgainst - (x.goalsFor - x.goalsAgainst) ||
      y.goalsFor - x.goalsFor ||
      x.name.localeCompare(y.name),
  );
}

async function assertTournament(tx: Tx, eventId: string) {
  const [e] = (await tx.execute(sql`SELECT kind FROM bola.events WHERE id = ${eventId}::uuid`)) as unknown as { kind: string }[];
  if (!e) throw notFound("Event");
  if (e.kind !== "tournament") throw new AppError(422, "not_tournament", "Fitur tim dan klasemen hanya untuk turnamen.");
}

export async function addEventTeam(ctx: AcademyContext, eventId: string, name: string, group: string | null, teamId: string | null): Promise<string> {
  await gate(ctx);
  return inAcademy(ctx, async (tx) => {
    await assertTournament(tx, eventId);
    const [row] = (await tx
      .execute(sql`
        INSERT INTO bola.event_teams (business_id, event_id, name, group_name, team_id)
        VALUES (${ctx.businessId}::uuid, ${eventId}::uuid, ${name.trim()}, ${group?.trim() || null}, ${teamId}::uuid) RETURNING id`)
      .catch((e: unknown) => {
        if ((e as { cause?: { code?: string } })?.cause?.code === "23505") throw new AppError(409, "duplicate", "Nama tim sudah ada di turnamen ini.", { name: "Nama sudah ada." });
        throw e;
      })) as unknown as { id: string }[];
    return row!.id;
  });
}

export async function removeEventTeam(ctx: AcademyContext, eventTeamId: string): Promise<void> {
  await gate(ctx);
  await inAcademy(ctx, async (tx) => {
    await tx.execute(sql`DELETE FROM bola.event_teams WHERE id = ${eventTeamId}::uuid`);
  });
}

export async function addFixture(ctx: AcademyContext, eventId: string, homeId: string, awayId: string, round: string | null, playedOn: string | null): Promise<string> {
  await gate(ctx);
  if (homeId === awayId) throw new AppError(422, "invalid", "Pilih dua tim yang berbeda.");
  return inAcademy(ctx, async (tx) => {
    await assertTournament(tx, eventId);
    const ok = (await tx.execute(sql`
      SELECT count(*)::int AS n FROM bola.event_teams WHERE event_id = ${eventId}::uuid AND id IN (${homeId}::uuid, ${awayId}::uuid)`)) as unknown as { n: number }[];
    if (ok[0]!.n !== 2) throw notFound("Tim");
    const [row] = (await tx.execute(sql`
      INSERT INTO bola.event_fixtures (business_id, event_id, home_id, away_id, round, played_on)
      VALUES (${ctx.businessId}::uuid, ${eventId}::uuid, ${homeId}::uuid, ${awayId}::uuid, ${round?.trim() || null}, ${playedOn}::date) RETURNING id`)) as unknown as { id: string }[];
    return row!.id;
  });
}

export async function setScore(ctx: AcademyContext, fixtureId: string, home: number | null, away: number | null): Promise<void> {
  await gate(ctx);
  if ((home === null) !== (away === null)) throw new AppError(422, "invalid", "Isi skor kedua tim.");
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`
      UPDATE bola.event_fixtures SET home_score = ${home}, away_score = ${away}, played_on = coalesce(played_on, CASE WHEN ${home}::int IS NULL THEN NULL ELSE current_date END)
      WHERE id = ${fixtureId}::uuid RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Pertandingan");
  });
}

export async function deleteFixture(ctx: AcademyContext, fixtureId: string): Promise<void> {
  await gate(ctx);
  await inAcademy(ctx, async (tx) => {
    await tx.execute(sql`DELETE FROM bola.event_fixtures WHERE id = ${fixtureId}::uuid`);
  });
}

// ---------- Portal orang tua ----------

export interface ParentEvent extends EventRow {
  mine: { id: string; status: Participant["status"]; result: string | null; rank: number | null } | null;
  standings: Standing[];
}

/** Event yang dibuka/berjalan/selesai untuk dilihat orang tua, beserta status anaknya. */
export async function eventsForPlayer(tx: Tx, playerId: string): Promise<ParentEvent[]> {
  const events = (await tx.execute(sql`
    SELECT ${EVENT_COLS} FROM bola.events e WHERE e.status IN ('open', 'closed', 'done')
    ORDER BY (e.status = 'done'), e.starts_on LIMIT 30`)) as unknown as EventRow[];
  const mine = (await tx.execute(sql`
    SELECT id, event_id AS "eventId", status, result, rank FROM bola.event_participants WHERE player_id = ${playerId}::uuid`)) as unknown as {
    id: string; eventId: string; status: Participant["status"]; result: string | null; rank: number | null;
  }[];
  const out: ParentEvent[] = [];
  for (const e of events) {
    const m = mine.find((x) => x.eventId === e.id);
    out.push({
      ...e,
      mine: m ? { id: m.id, status: m.status, result: m.result, rank: m.rank } : null,
      standings: e.kind === "tournament" ? (await tournamentOf(tx, e.id)).standings : [],
    });
  }
  return out;
}

export async function cancelOwnIn(tx: Tx, playerId: string, eventId: string): Promise<void> {
  const rows = (await tx.execute(sql`
    UPDATE bola.event_participants SET status = 'cancelled'
    WHERE event_id = ${eventId}::uuid AND player_id = ${playerId}::uuid AND status = 'registered' RETURNING id`)) as unknown as unknown[];
  if (!rows.length) throw new AppError(409, "paid", "Pendaftaran yang sudah dibayar dibatalkan lewat akademi.");
}
