import { EvaluationInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { deleteEvaluation, updateEvaluation } from "@/server/evaluations";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const PUT = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  await updateEvaluation(academy, await routeId(ctx, "Rapor"), await body(req, EvaluationInput));
  return noContent();
});

export const DELETE = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  await deleteEvaluation(academy, await routeId(ctx, "Rapor"));
  return noContent();
});
