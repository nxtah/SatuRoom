import { AcademyInput } from "@/lib/schemas";
import { createAcademy, listMyAcademies } from "@/server/academy";
import { requireSession } from "@/server/context";
import { body, clientIp, ok, route } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

export const GET = route(async () => {
  const session = await requireSession();
  return ok({ academies: await listMyAcademies(session.userId) });
});

export const POST = route(async (req) => {
  const session = await requireSession();
  rateLimit(`academy-create:${session.userId}:${clientIp(req)}`, 5, 60 * 60_000);
  const input = await body(req, AcademyInput);
  const id = await createAcademy(session, input);
  return ok({ id }, 201);
});
