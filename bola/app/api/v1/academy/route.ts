import { AcademyInput } from "@/lib/schemas";
import { getAcademy, updateAcademy } from "@/server/academy";
import { academyContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";

export const GET = route(async () => ok(await getAcademy(await academyContext())));

export const PATCH = route(async (req) => {
  const ctx = await academyContext();
  await updateAcademy(ctx, await body(req, AcademyInput));
  return noContent();
});
