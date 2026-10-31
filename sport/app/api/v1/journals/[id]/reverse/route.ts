import { reverseManualJournal } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  await reverseManualJournal(await academyContext(), await routeId(ctx, "Jurnal"));
  return noContent();
});
