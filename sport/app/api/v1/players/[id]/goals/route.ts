import { GoalInput } from "@/lib/schemas";
import { createGoal } from "@/server/assessments";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  return ok({ id: await createGoal(academy, await routeId(ctx, "Pemain"), await body(req, GoalInput)) }, 201);
});
