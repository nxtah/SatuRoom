import { InvitationIdInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { acceptGuardianInvitation } from "@/server/guardian";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const session = await requireSession();
  const { invitationId } = await body(req, InvitationIdInput);
  return ok({ playerId: await acceptGuardianInvitation(session, invitationId) });
});
