import { z } from "zod";
import { requireSession } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { parentRegister, parentUnregister } from "@/server/parent-portal";

const Input = z.object({ eventId: z.string().uuid() });

export const POST = route(async (req) => {
  await parentRegister(await requireSession(), (await body(req, Input)).eventId);
  return noContent();
});

export const DELETE = route(async (req) => {
  await parentUnregister(await requireSession(), (await body(req, Input)).eventId);
  return noContent();
});
