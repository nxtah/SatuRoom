import { z } from "zod";
import { academyContext } from "@/server/context";
import { deleteFixture, setScore } from "@/server/events";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

type P = { params: Promise<{ id: string }> };

const score = z.preprocess((v) => (v === "" || v === null ? null : v), z.coerce.number().int().min(0).max(999).nullable());

export const PUT = route(async (req, c: P) => {
  const b = await body(req, z.object({ home: score, away: score }));
  await setScore(await academyContext(), await routeId(c, "Pertandingan"), b.home, b.away);
  return noContent();
});

export const DELETE = route(async (_req, c: P) => {
  await deleteFixture(await academyContext(), await routeId(c, "Pertandingan"));
  return noContent();
});
