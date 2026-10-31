import { z } from "zod";
import { academyContext } from "@/server/context";
import { registerPlayers } from "@/server/events";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type P = { params: Promise<{ id: string }> };

export const POST = route(async (req, c: P) => {
  const { playerIds } = await body(req, z.object({ playerIds: z.array(z.string().uuid()).min(1, "Pilih pemain.").max(200) }));
  return ok({ count: await registerPlayers(await academyContext(), await routeId(c, "Event"), playerIds) });
});
