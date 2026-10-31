import { AssessmentInput } from "@/lib/schemas";
import { createAssessment } from "@/server/assessments";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  return ok({ id: await createAssessment(academy, await routeId(ctx, "Pemain"), await body(req, AssessmentInput)) }, 201);
});
