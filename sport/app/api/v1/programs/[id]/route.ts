import { ProgramInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { archiveProgram, updateProgram } from "@/server/programs";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) => {
  await updateProgram(await academyContext(), await routeId(ctx, "Program"), await body(req, ProgramInput));
  return noContent();
});

export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveProgram(await academyContext(), await routeId(ctx, "Program"));
  return noContent();
});
