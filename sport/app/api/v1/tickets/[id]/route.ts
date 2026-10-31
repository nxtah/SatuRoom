import { z } from "zod";
import { academyContext } from "@/server/context";
import { AppError } from "@/server/errors";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { closeTicket, staffReply } from "@/server/support";

type P = { params: Promise<{ id: string }> };

export const POST = route(async (req, c: P) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Pesan");
  const b = await body(req, z.object({ action: z.enum(["reply", "close"]), body: z.string().trim().max(2000).optional() }));
  if (b.action === "close") await closeTicket(ctx, id);
  else {
    if (!b.body) throw new AppError(422, "invalid", "Tulis balasan.", { body: "Tulis balasan." });
    await staffReply(ctx, id, b.body);
  }
  return noContent();
});
