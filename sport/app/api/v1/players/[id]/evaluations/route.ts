import { EvaluationInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { createEvaluation } from "@/server/evaluations";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  const playerId = await routeId(ctx, "Pemain");
  return ok({ id: await createEvaluation(academy, playerId, await body(req, EvaluationInput)) }, 201);
});
