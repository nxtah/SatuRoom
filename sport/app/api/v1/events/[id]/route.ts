import { z } from "zod";
import { academyContext } from "@/server/context";
import { EventInput, getEvent, setEventStatus, updateEvent } from "@/server/events";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type P = { params: Promise<{ id: string }> };

export const GET = route(async (_req, c: P) => ok(await getEvent(await academyContext(), await routeId(c, "Event"))));

export const PUT = route(async (req, c: P) => {
  await updateEvent(await academyContext(), await routeId(c, "Event"), await body(req, EventInput));
  return noContent();
});

/** Mengubah status event: open, closed, done, cancelled. */
export const POST = route(async (req, c: P) => {
  const { status } = await body(req, z.object({ status: z.enum(["draft", "open", "closed", "done", "cancelled"]) }));
  await setEventStatus(await academyContext(), await routeId(c, "Event"), status);
  return noContent();
});
