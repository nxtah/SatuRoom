import { z } from "zod";
import { academyContext } from "@/server/context";
import { addEventTeam } from "@/server/events";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type P = { params: Promise<{ id: string }> };

export const POST = route(async (req, c: P) => {
  const b = await body(req, z.object({
    name: z.string().trim().min(2, "Isi nama tim.").max(60),
    group: z.string().trim().max(20).optional(),
    teamId: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  }));
  return ok({ id: await addEventTeam(await academyContext(), await routeId(c, "Event"), b.name, b.group ?? null, b.teamId ?? null) }, 201);
});
