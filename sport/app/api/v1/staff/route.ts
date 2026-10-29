import { InviteInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { inviteStaff, listStaff } from "@/server/staff";

export const GET = route(async () => ok(await listStaff(await academyContext())));

/** Mengundang staf lewat email. */
export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await inviteStaff(ctx, await body(req, InviteInput)) }, 201);
});
