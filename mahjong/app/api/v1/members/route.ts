import { MemberInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createMember, listMembers } from "@/server/members";

export const GET = route(async (req) => ok({ members: await listMembers(await venueContext(), req.nextUrl.searchParams.get("q") ?? "", 20) }));

export const POST = route(async (req) => ok({ id: await createMember(await venueContext(), await body(req, MemberInput)) }, 201));
