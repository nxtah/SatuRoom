import { academyContext } from "@/server/context";
import { notFound } from "@/server/errors";
import { revokeGuardianInvitation } from "@/server/guardian";
import { noContent, route } from "@/server/http";
import { isUuid } from "@/server/ids";

type Ctx = { params: Promise<{ id: string; invitationId: string }> };

export const DELETE = route(async (_req, ctx: Ctx) => {
  const { id, invitationId } = await ctx.params;
  if (!isUuid(id) || !isUuid(invitationId)) throw notFound("Undangan");
  await revokeGuardianInvitation(await academyContext(), id, invitationId);
  return noContent();
});
