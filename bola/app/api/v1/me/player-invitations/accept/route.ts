import { AcceptPlayerInvitationInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { acceptPlayerInvitation } from "@/server/player-account";

export const POST = route(async (req) => {
  const session = await requireSession();
  const { invitationId, consentBy } = await body(req, AcceptPlayerInvitationInput);
  return ok({ playerId: await acceptPlayerInvitation(session, invitationId, consentBy) });
});
