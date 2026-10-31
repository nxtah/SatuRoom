import { z } from "zod";
import { TemplateInput } from "@/lib/schemas";
import { createDefaultTemplate, createTemplate, listTemplates } from "@/server/assessments";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

const CreateInput = z.union([z.object({ useDefault: z.literal(true) }), TemplateInput]);

export const GET = route(async () => ok(await listTemplates(await academyContext())));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  const input = await body(req, CreateInput);
  return ok({ id: "useDefault" in input ? await createDefaultTemplate(ctx) : await createTemplate(ctx, input) }, 201);
});
