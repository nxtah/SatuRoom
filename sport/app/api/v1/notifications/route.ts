import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { markRead, myNotifications } from "@/server/notifications";

export const GET = route(async () => ok(await myNotifications(await academyContext())));

/** Tandai dibaca: satu (id) atau semua. */
export const POST = route(async (req) => {
  const { id } = await body(req, z.object({ id: z.string().uuid().optional() }));
  await markRead(await academyContext(), id);
  return noContent();
});
