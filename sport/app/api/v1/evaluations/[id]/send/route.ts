import { academyContext } from "@/server/context";
import { sendEvaluation } from "@/server/evaluations";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  await sendEvaluation(academy, await routeId(ctx, "Rapor"));
  return noContent();
});
