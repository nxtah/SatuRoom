import { RegistrationApproveInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { approveRegistration } from "@/server/registrations";

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  const id = await routeId(ctx, "Pendaftar");
  return ok({ playerId: await approveRegistration(academy, id, await body(req, RegistrationApproveInput)) });
});
