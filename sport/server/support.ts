import "server-only";
import type { Tx } from "@saturoom/core/db";
import { auditEvents } from "@saturoom/core/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { inAcademy, requireModule, requirePermission, type AcademyContext } from "./context";
import { AppError, notFound } from "./errors";
import { accountsOf, notify, staffWith } from "./notifications";

export const TicketInput = z.object({
  category: z.enum(["question", "complaint", "feedback", "other"]),
  subject: z.string().trim().min(3, "Tulis judul singkat.").max(120),
  body: z.string().trim().min(3, "Tulis pesan Anda.").max(2000),
});
export const ReplyInput = z.object({ body: z.string().trim().min(1, "Tulis balasan.").max(2000) });

export type TicketStatus = "open" | "answered" | "closed";
export type TicketCategory = z.infer<typeof TicketInput>["category"];

export interface TicketRow {
  id: string;
  playerId: string;
  playerName: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  rating: number | null;
  updatedAt: string;
  lastFromStaff: boolean;
  messages: { id: string; body: string; fromStaff: boolean; author: string | null; createdAt: string }[];
}

async function ticketsWhere(tx: Tx, where: ReturnType<typeof sql>): Promise<TicketRow[]> {
  const tickets = (await tx.execute(sql`
    SELECT t.id, t.player_id AS "playerId", p.full_name AS "playerName", t.category, t.subject, t.status, t.rating,
      to_char(t.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt",
      coalesce((SELECT m.from_staff FROM bola.ticket_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1), false) AS "lastFromStaff"
    FROM bola.tickets t JOIN bola.players p ON p.id = t.player_id
    WHERE ${where} ORDER BY (t.status = 'closed'), t.updated_at DESC LIMIT 100`)) as unknown as Omit<TicketRow, "messages">[];
  if (!tickets.length) return [];
  const msgs = (await tx.execute(sql`
    SELECT m.id, m.ticket_id AS "ticketId", m.body, m.from_staff AS "fromStaff", u.name AS author,
      to_char(m.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
    FROM bola.ticket_messages m LEFT JOIN core.users u ON u.id = m.author_id
    WHERE m.ticket_id = ANY (${`{${tickets.map((t) => t.id).join(",")}}`}::uuid[]) ORDER BY m.created_at`)) as unknown as (TicketRow["messages"][number] & { ticketId: string })[];
  return tickets.map((t) => ({ ...t, messages: msgs.filter((m) => m.ticketId === t.id).map(({ ticketId: _t, ...m }) => m) }));
}

// ---------- Staf ----------

function gate(ctx: AcademyContext) {
  requireModule(ctx, "support");
  requirePermission(ctx, "support.manage");
}

export async function listTickets(ctx: AcademyContext, status: "active" | "closed" = "active"): Promise<TicketRow[]> {
  gate(ctx);
  return inAcademy(ctx, (tx) => ticketsWhere(tx, status === "closed" ? sql`t.status = 'closed'` : sql`t.status <> 'closed'`));
}

export async function openTicketCount(ctx: AcademyContext): Promise<number> {
  if (!ctx.modules.has("support") || !ctx.can("support.manage")) return 0;
  return inAcademy(ctx, async (tx) => {
    const [r] = (await tx.execute(sql`SELECT count(*)::int AS n FROM bola.tickets WHERE status = 'open'`)) as unknown as { n: number }[];
    return r!.n;
  });
}

export async function staffReply(ctx: AcademyContext, ticketId: string, body: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const [t] = (await tx.execute(sql`SELECT status, player_id AS "playerId", subject FROM bola.tickets WHERE id = ${ticketId}::uuid FOR UPDATE`)) as unknown as { status: TicketStatus; playerId: string; subject: string }[];
    if (!t) throw notFound("Pesan");
    if (t.status === "closed") throw new AppError(409, "closed", "Percakapan ini sudah ditutup.");
    await tx.execute(sql`
      INSERT INTO bola.ticket_messages (business_id, ticket_id, author_id, from_staff, body)
      VALUES (${ctx.businessId}::uuid, ${ticketId}::uuid, ${ctx.userId}::uuid, true, ${body})`);
    await tx.execute(sql`UPDATE bola.tickets SET status = 'answered', updated_at = now() WHERE id = ${ticketId}::uuid`);
    await notify(tx, ctx.businessId, await accountsOf(tx, [t.playerId]), { title: `Akademi membalas: ${t.subject}`, body: body.slice(0, 140), href: "/saya/layanan" });
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "ticket.replied", targetType: "ticket", targetId: ticketId });
  });
}

export async function closeTicket(ctx: AcademyContext, ticketId: string): Promise<void> {
  gate(ctx);
  await inAcademy(ctx, async (tx) => {
    const rows = (await tx.execute(sql`UPDATE bola.tickets SET status = 'closed', updated_at = now() WHERE id = ${ticketId}::uuid RETURNING id`)) as unknown as unknown[];
    if (!rows.length) throw notFound("Pesan");
    await tx.insert(auditEvents).values({ businessId: ctx.businessId, actorUserId: ctx.userId, action: "ticket.closed", targetType: "ticket", targetId: ticketId });
  });
}

// ---------- Orang tua (dipanggil di dalam playerTx) ----------

export const ticketsForPlayer = (tx: Tx, playerId: string) => ticketsWhere(tx, sql`t.player_id = ${playerId}::uuid`);

export async function createTicketIn(tx: Tx, businessId: string, userId: string, playerId: string, input: z.infer<typeof TicketInput>): Promise<string> {
  const [open] = (await tx.execute(sql`
    SELECT count(*)::int AS n FROM bola.tickets WHERE player_id = ${playerId}::uuid AND status <> 'closed'`)) as unknown as { n: number }[];
  if (open!.n >= 5) throw new AppError(429, "too_many", "Masih ada 5 pesan yang belum selesai. Tunggu balasan akademi dulu.");
  const [t] = (await tx.execute(sql`
    INSERT INTO bola.tickets (business_id, player_id, created_by, category, subject)
    VALUES (${businessId}::uuid, ${playerId}::uuid, ${userId}::uuid, ${input.category}::bola.ticket_category, ${input.subject})
    RETURNING id`)) as unknown as { id: string }[];
  await tx.execute(sql`
    INSERT INTO bola.ticket_messages (business_id, ticket_id, author_id, from_staff, body)
    VALUES (${businessId}::uuid, ${t!.id}::uuid, ${userId}::uuid, false, ${input.body})`);
  await notify(tx, businessId, await staffWith(tx, businessId, "support.manage"), { title: `Pesan baru dari orang tua: ${input.subject}`, href: "/layanan" });
  await tx.insert(auditEvents).values({ businessId, actorUserId: userId, action: "ticket.created", targetType: "ticket", targetId: t!.id, meta: { category: input.category } });
  return t!.id;
}

async function ownTicket(tx: Tx, playerId: string, ticketId: string) {
  const [t] = (await tx.execute(sql`
    SELECT status, subject FROM bola.tickets WHERE id = ${ticketId}::uuid AND player_id = ${playerId}::uuid FOR UPDATE`)) as unknown as { status: TicketStatus; subject: string }[];
  if (!t) throw notFound("Pesan");
  return t;
}

export async function parentReplyIn(tx: Tx, businessId: string, userId: string, playerId: string, ticketId: string, body: string): Promise<void> {
  const t = await ownTicket(tx, playerId, ticketId);
  if (t.status === "closed") throw new AppError(409, "closed", "Percakapan ini sudah ditutup. Kirim pesan baru bila perlu.");
  await tx.execute(sql`
    INSERT INTO bola.ticket_messages (business_id, ticket_id, author_id, from_staff, body)
    VALUES (${businessId}::uuid, ${ticketId}::uuid, ${userId}::uuid, false, ${body})`);
  await tx.execute(sql`UPDATE bola.tickets SET status = 'open', updated_at = now() WHERE id = ${ticketId}::uuid`);
  await notify(tx, businessId, await staffWith(tx, businessId, "support.manage"), { title: `Balasan orang tua: ${t.subject}`, href: "/layanan" });
}

/** Orang tua menutup percakapan dan (boleh) memberi nilai 1-5. */
export async function parentCloseIn(tx: Tx, playerId: string, ticketId: string, rating: number | null): Promise<void> {
  await ownTicket(tx, playerId, ticketId);
  await tx.execute(sql`UPDATE bola.tickets SET status = 'closed', rating = ${rating}, updated_at = now() WHERE id = ${ticketId}::uuid`);
}
