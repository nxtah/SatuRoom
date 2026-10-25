import { SwitchInput } from "@/lib/schemas";
import { switchAcademy } from "@/server/academy";
import { requireSession } from "@/server/context";
import { body, noContent, route } from "@/server/http";

export const POST = route(async (req) => {
  const session = await requireSession();
  const { academyId } = await body(req, SwitchInput);
  await switchAcademy(session, academyId);
  return noContent();
});
