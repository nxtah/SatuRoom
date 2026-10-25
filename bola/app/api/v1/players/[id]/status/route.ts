import { PlayerStatusInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { notFound } from "@/server/errors";
import { body, noContent, route } from "@/server/http";
import { setPlayerStatus } from "@/server/players";

type Ctx = { params: Promise<{ id: string }> };

/** Menonaktifkan atau mengaktifkan lagi pemain. Pemain tidak pernah dihapus permanen. */
export const POST = route(async (req, ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Pemain");
  const { status } = await body(req, PlayerStatusInput);
  await setPlayerStatus(await academyContext(), id, status);
  return noContent();
});
