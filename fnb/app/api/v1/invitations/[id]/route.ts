import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { revokeInvitation } from "@/server/invitations";

export const DELETE = route<{ id: string }>(async (_req, ctx, { id }) => {
  await revokeInvitation(ctx, id);
  return NextResponse.json({ ok: true });
});
