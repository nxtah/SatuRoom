import { ModuleToggleInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { listModules, setModule } from "@/server/modules";

export const GET = route(async () => ok(await listModules(await academyContext())));

export const PUT = route(async (req) => {
  const { module, enabled } = await body(req, ModuleToggleInput);
  await setModule(await academyContext(), module, enabled);
  return noContent();
});
