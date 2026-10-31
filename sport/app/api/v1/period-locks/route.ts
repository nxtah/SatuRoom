import { PeriodLockInput } from "@/lib/schemas";
import { setLock } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";

export const PUT = route(async (req) => {
  const { month, locked } = await body(req, PeriodLockInput);
  await setLock(await academyContext(), month, locked);
  return noContent();
});
