import { ManualJournalInput } from "@/lib/schemas";
import { createManualJournal } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createManualJournal(ctx, await body(req, ManualJournalInput)) }, 201);
});
