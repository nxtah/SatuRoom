import { GenerateInvoicesInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { generateInvoices } from "@/server/fees";
import { body, ok, route } from "@/server/http";

/** Membuat tagihan bulan tertentu untuk pemain bertarif yang belum ditagih. */
export const POST = route(async (req) => {
  const { month } = await body(req, GenerateInvoicesInput);
  return ok({ created: await generateInvoices(await academyContext(), month) });
});
