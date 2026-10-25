import { InvitationIdInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { acceptInvitation } from "@/server/staff";

export const POST = route(async (req) => {
  const session = await requireSession();
  const { invitationId } = await body(req, InvitationIdInput);
  return ok({ academyId: await acceptInvitation(session, invitationId) });
});
