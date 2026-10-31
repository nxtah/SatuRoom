import "server-only";
import type { SessionInfo } from "@saturoom/core/auth";
import type { Tx } from "@saturoom/core/db";
import { sql } from "drizzle-orm";
import type { z } from "zod";
import { effectiveModules, type ModuleKey } from "@/lib/modules";
import { AppError } from "./errors";
import { cancelOwnIn, eventsForPlayer, registerIn, type ParentEvent } from "./events";
import { listNotificationsIn, markReadIn, notify, staffWith, type NotificationRow } from "./notifications";
import { playerTx } from "./player-account";
import { createTicketIn, parentCloseIn, parentReplyIn, ticketsForPlayer, type TicketInput, type TicketRow } from "./support";

/** Modul yang menyala di akademi anak yang sedang dilihat. */
async function modulesOn(tx: Tx): Promise<Set<ModuleKey>> {
  const off = (await tx.execute(sql`SELECT module FROM bola.academy_modules WHERE NOT enabled`)) as unknown as { module: string }[];
  return effectiveModules(off.map((r) => r.module));
}

async function need(tx: Tx, key: ModuleKey) {
  if (!(await modulesOn(tx)).has(key)) throw new AppError(403, "module_off", "Fitur ini tidak aktif di akademi.");
}

// ---------- Event ----------

export async function parentEvents(session: SessionInfo): Promise<ParentEvent[] | null> {
  return playerTx(session, async (tx, link) => ((await modulesOn(tx)).has("events") ? eventsForPlayer(tx, link.playerId) : null));
}

export async function parentRegister(session: SessionInfo, eventId: string): Promise<void> {
  await playerTx(session, async (tx, link) => {
    await need(tx, "events");
    await registerIn(tx, link.businessId, session.userId, eventId, link.playerId, "parent");
    const [p] = (await tx.execute(sql`
      SELECT pl.full_name AS name, e.title FROM bola.players pl, bola.events e WHERE pl.id = ${link.playerId}::uuid AND e.id = ${eventId}::uuid`)) as unknown as { name: string; title: string }[];
    await notify(tx, link.businessId, await staffWith(tx, link.businessId, "events.manage"), { title: `${p!.name} mendaftar ${p!.title}`, href: `/event/${eventId}` });
  });
}

export async function parentUnregister(session: SessionInfo, eventId: string): Promise<void> {
  await playerTx(session, async (tx, link) => {
    await need(tx, "events");
    await cancelOwnIn(tx, link.playerId, eventId);
  });
}

// ---------- Layanan ----------

export async function parentTickets(session: SessionInfo): Promise<TicketRow[] | null> {
  return playerTx(session, async (tx, link) => ((await modulesOn(tx)).has("support") ? ticketsForPlayer(tx, link.playerId) : null));
}

export async function parentCreateTicket(session: SessionInfo, input: z.infer<typeof TicketInput>): Promise<string> {
  return playerTx(session, async (tx, link) => {
    await need(tx, "support");
    return createTicketIn(tx, link.businessId, session.userId, link.playerId, input);
  });
}

export async function parentReply(session: SessionInfo, ticketId: string, body: string): Promise<void> {
  await playerTx(session, async (tx, link) => {
    await need(tx, "support");
    await parentReplyIn(tx, link.businessId, session.userId, link.playerId, ticketId, body);
  });
}

export async function parentClose(session: SessionInfo, ticketId: string, rating: number | null): Promise<void> {
  await playerTx(session, async (tx, link) => {
    await need(tx, "support");
    await parentCloseIn(tx, link.playerId, ticketId, rating);
  });
}

// ---------- Notifikasi (akademi anak yang sedang dilihat) ----------

export async function parentNotifications(session: SessionInfo): Promise<{ items: NotificationRow[]; unread: number }> {
  return playerTx(session, (tx) => listNotificationsIn(tx, session.userId));
}

export async function parentMarkRead(session: SessionInfo, id?: string): Promise<void> {
  await playerTx(session, (tx) => markReadIn(tx, session.userId, id));
}

/** Modul akademi anak yang sedang dilihat, untuk menampilkan pintasan portal. */
export async function parentModules(session: SessionInfo): Promise<ModuleKey[]> {
  return playerTx(session, async (tx) => [...(await modulesOn(tx))]);
}
