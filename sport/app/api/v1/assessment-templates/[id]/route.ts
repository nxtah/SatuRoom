import { TemplateInput } from "@/lib/schemas";
import { archiveTemplate, updateTemplate } from "@/server/assessments";
import { academyContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req, ctx: Ctx) =>
  ok({ id: await updateTemplate(await academyContext(), await routeId(ctx, "Template"), await body(req, TemplateInput)) }),
);

export const DELETE = route(async (_req, ctx: Ctx) => {
  await archiveTemplate(await academyContext(), await routeId(ctx, "Template"));
  return noContent();
});
