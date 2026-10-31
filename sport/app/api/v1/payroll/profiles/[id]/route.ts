import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { PayProfileInput, setPayProfile } from "@/server/payroll";

export const PUT = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Staf");
  await setPayProfile(ctx, id, await body(req, PayProfileInput));
  return noContent();
});
