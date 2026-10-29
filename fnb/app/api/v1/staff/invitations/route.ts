import { NextResponse } from "next/server";
import { InviteInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { inviteStaff, listInvites } from "@/server/invitations";

export const GET = route(async (_req, ctx) => NextResponse.json(await listInvites(ctx)));
export const POST = route(async (req, ctx) => NextResponse.json(await inviteStaff(ctx, await body(req, InviteInput)), { status: 201 }));
