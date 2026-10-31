import { z } from "zod";
import { academyContext } from "@/server/context";
import { cancelParticipant, payParticipant, setResult } from "@/server/events";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

type P = { params: Promise<{ id: string }> };

export const POST = route(async (req, c: P) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Peserta");
  const b = await body(req, z.object({
    action: z.enum(["pay", "cancel", "result"]),
    method: z.enum(["cash", "transfer", "other"]).default("cash"),
    paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    rank: z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().int().min(1).max(999).nullable()).optional(),
    result: z.preprocess((v) => (typeof v === "string" && !v.trim() ? null : v), z.string().trim().max(60).nullable()).optional(),
  }));
  if (b.action === "pay") await payParticipant(ctx, id, b.method, b.paidOn ?? new Date().toISOString().slice(0, 10));
  else if (b.action === "cancel") await cancelParticipant(ctx, id);
  else await setResult(ctx, id, b.rank ?? null, b.result ?? null);
  return noContent();
});
