import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { revokeInvitation } from "@/server/staff";

type Ctx = { params: Promise<{ id: string }> };

/** Membatalkan undangan yang belum diterima. */
export const DELETE = route(async (_req, ctx: Ctx) => {
  await revokeInvitation(await academyContext(), await routeId(ctx, "Undangan"));
  return noContent();
});
