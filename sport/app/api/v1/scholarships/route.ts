import { ScholarshipInput } from "@/lib/schemas";
import { createScholarship } from "@/server/accounting";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createScholarship(ctx, await body(req, ScholarshipInput)) }, 201);
});
