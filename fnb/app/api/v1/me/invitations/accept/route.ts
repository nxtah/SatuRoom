import { NextResponse } from "next/server";
import { InvitationIdInput } from "@/lib/schemas";
import { body, sessionRoute } from "@/server/http";
import { acceptInvitation } from "@/server/invitations";

export const POST = sessionRoute(async (req, session) => {
  const { invitationId } = await body(req, InvitationIdInput);
  return NextResponse.json({ businessId: await acceptInvitation(session, invitationId) });
});
