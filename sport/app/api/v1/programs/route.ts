import { ProgramInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createProgram, listPrograms } from "@/server/programs";

export const GET = route(async () => ok(await listPrograms(await academyContext())));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createProgram(ctx, await body(req, ProgramInput)) }, 201);
});
