import { NextResponse } from "next/server";
import { VoucherCheckInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { checkVoucher } from "@/server/promos";

export const POST = route(async (req, ctx) => {
  const { code, subtotal } = await body(req, VoucherCheckInput);
  return NextResponse.json(await checkVoucher(ctx, code, subtotal));
});
