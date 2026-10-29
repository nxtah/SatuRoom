import { NextResponse } from "next/server";
import { z } from "zod";
import { OrderStatusInput } from "@/lib/schemas";
import { body, route } from "@/server/http";
import { updateOrderStatus } from "@/server/orders";

export const PATCH = route<{ id: string }>(async (req, ctx, { id }) => {
  const input = await body(req, OrderStatusInput);
  await updateOrderStatus(ctx, z.string().uuid().parse(id), input.status, input.reason);
  return new NextResponse(null, { status: 204 });
});
