import { notFound } from "./errors";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
export const isIsoDate = (v: unknown): v is string => typeof v === "string" && DATE.test(v) && !Number.isNaN(Date.parse(v));

/** Id dari URL: format salah diperlakukan seperti tidak ada. */
export async function routeId(ctx: { params: Promise<{ id: string }> }, what: string): Promise<string> {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw notFound(what);
  return id;
}
