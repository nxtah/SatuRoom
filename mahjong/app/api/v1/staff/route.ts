import { InviteInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { inviteStaff, listStaff } from "@/server/staff";

export const GET = route(async () => ok(await listStaff(await venueContext())));

export const POST = route(async (req) => ok({ id: await inviteStaff(await venueContext(), await body(req, InviteInput)) }, 201));
