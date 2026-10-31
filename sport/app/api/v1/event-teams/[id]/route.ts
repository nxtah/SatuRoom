import { academyContext } from "@/server/context";
import { removeEventTeam } from "@/server/events";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

type P = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req, c: P) => {
  await removeEventTeam(await academyContext(), await routeId(c, "Tim"));
  return noContent();
});
