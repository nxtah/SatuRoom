import { z } from "zod";
import { requireSession } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { parentMarkRead, parentNotifications } from "@/server/parent-portal";

export const GET = route(async () => ok(await parentNotifications(await requireSession())));

export const POST = route(async (req) => {
  const { id } = await body(req, z.object({ id: z.string().uuid().optional() }));
  await parentMarkRead(await requireSession(), id);
  return noContent();
});
