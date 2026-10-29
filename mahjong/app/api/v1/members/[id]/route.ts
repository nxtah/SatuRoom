import { MemberInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { getMember, updateMember } from "@/server/members";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, ctx: Ctx) => ok(await getMember(await venueContext(), await routeId(ctx, "Member"))));

export const PATCH = route(async (req, ctx: Ctx) => {
  await updateMember(await venueContext(), await routeId(ctx, "Member"), await body(req, MemberInput));
  return noContent();
});
