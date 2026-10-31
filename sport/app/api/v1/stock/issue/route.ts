import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { IssueInput, issueStock } from "@/server/inventory";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  await issueStock(ctx, await body(req, IssueInput));
  return noContent();
});
