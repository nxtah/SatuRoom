import { InvitationIdInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { acceptInvitation } from "@/server/staff";

export const POST = route(async (req) => {
  const session = await requireSession();
  return ok({ venueId: await acceptInvitation(session, (await body(req, InvitationIdInput)).invitationId) });
});
