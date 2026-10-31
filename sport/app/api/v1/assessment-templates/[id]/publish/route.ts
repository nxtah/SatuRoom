import { publishTemplate } from "@/server/assessments";
import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await publishTemplate(await academyContext(), await routeId(ctx, "Template"));
  return noContent();
});
