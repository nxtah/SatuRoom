import { deleteAssessment } from "@/server/assessments";
import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await deleteAssessment(await academyContext(), await routeId(ctx, "Penilaian"));
  return noContent();
});
