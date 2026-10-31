import { z } from "zod";
import { academyContext } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { adjustSlip } from "@/server/payroll";

export const POST = route(async (req, c: { params: Promise<{ id: string }> }) => {
  const ctx = await academyContext();
  const id = await routeId(c, "Slip gaji");
  const b = await body(req, z.object({ label: z.string().trim().min(2, "Isi keterangan.").max(60), amount: z.coerce.number().int().min(1, "Isi nominal."), kind: z.enum(["earning", "deduction"]) }));
  await adjustSlip(ctx, id, b);
  return noContent();
});
