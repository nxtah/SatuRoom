import { NextResponse } from "next/server";
import { sessionRoute } from "@/server/http";
import { myInvitations } from "@/server/invitations";

export const GET = sessionRoute(async (_req, session) => NextResponse.json(await myInvitations(session.userId)));
