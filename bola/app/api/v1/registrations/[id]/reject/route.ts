import { RegistrationRejectInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { rejectRegistration } from "@/server/registrations";

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  const id = await routeId(ctx, "Pendaftar");
  await rejectRegistration(academy, id, await body(req, RegistrationRejectInput));
  return noContent();
});
