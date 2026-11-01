import { SessionPlanInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { setSessionPlan } from "@/server/schedule";

export const PUT = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const { topic, plan } = await body(req, SessionPlanInput);
  await setSessionPlan(await academyContext(), await routeId(c, "Sesi"), topic, plan);
  return noContent();
});
