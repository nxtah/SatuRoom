import { GoalStatusInput } from "@/lib/schemas";
import { setGoalStatus } from "@/server/assessments";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const PATCH = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const { status } = await body(req, GoalStatusInput);
  await setGoalStatus(await academyContext(), await routeId(ctx, "Target"), status);
  return noContent();
});
