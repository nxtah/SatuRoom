import { academyContext } from "@/server/context";
import { createEvent, EventInput } from "@/server/events";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createEvent(ctx, await body(req, EventInput)) }, 201);
});
