import { GuardianInviteInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { guardianAccess, inviteGuardian } from "@/server/guardian";
import { body, noContent, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req, ctx: Ctx) =>
  ok(await guardianAccess(await academyContext(), await routeId(ctx, "Pemain"))),
);

/** Mengundang orang tua/wali lewat email. */
export const POST = route(async (req, ctx: Ctx) => {
  const { email } = await body(req, GuardianInviteInput);
  await inviteGuardian(await academyContext(), await routeId(ctx, "Pemain"), email);
  return noContent();
});
