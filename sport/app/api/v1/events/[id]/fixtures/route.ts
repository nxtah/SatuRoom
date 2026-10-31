import { z } from "zod";
import { academyContext } from "@/server/context";
import { addFixture } from "@/server/events";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type P = { params: Promise<{ id: string }> };

export const POST = route(async (req, c: P) => {
  const b = await body(req, z.object({
    homeId: z.string().uuid({ message: "Pilih tim." }),
    awayId: z.string().uuid({ message: "Pilih tim." }),
    round: z.string().trim().max(30).optional(),
    playedOn: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  }));
  return ok({ id: await addFixture(await academyContext(), await routeId(c, "Event"), b.homeId, b.awayId, b.round ?? null, b.playedOn ?? null) }, 201);
});
