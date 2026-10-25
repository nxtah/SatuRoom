import { academyContext } from "@/server/context";
import { unlinkGuardian } from "@/server/guardian";
import { noContent, route } from "@/server/http";
import { isUuid } from "@/server/ids";
import { notFound } from "@/server/errors";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export const DELETE = route(async (_req, ctx: Ctx) => {
  const { id, userId } = await ctx.params;
  if (!isUuid(id) || !isUuid(userId)) throw notFound("Wali");
  await unlinkGuardian(await academyContext(), id, userId);
  return noContent();
});
