import { z } from "zod";
import { requireSession } from "@/server/context";
import { AppError } from "@/server/errors";
import { body, noContent, ok, route } from "@/server/http";
import { parentClose, parentCreateTicket, parentReply } from "@/server/parent-portal";
import { TicketInput } from "@/server/support";

export const POST = route(async (req) => {
  return ok({ id: await parentCreateTicket(await requireSession(), await body(req, TicketInput)) }, 201);
});

/** Membalas atau menutup (dengan nilai 1-5) percakapan milik anak ini. */
export const PUT = route(async (req) => {
  const b = await body(req, z.object({
    ticketId: z.string().uuid(),
    action: z.enum(["reply", "close"]),
    body: z.string().trim().min(1, "Tulis balasan.").max(2000).optional(),
    rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  }));
  const session = await requireSession();
  if (b.action === "close") await parentClose(session, b.ticketId, b.rating ?? null);
  else if (!b.body) throw new AppError(422, "invalid", "Tulis balasan.", { body: "Tulis balasan." });
  else await parentReply(session, b.ticketId, b.body);
  return noContent();
});
