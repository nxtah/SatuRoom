import { z } from "zod";
import { OrderLineInput } from "@/server/inventory";
import { requireSession } from "@/server/context";
import { body, noContent, ok, route } from "@/server/http";
import { parentCancel, parentOrder } from "@/server/store-parent";

/** Orang tua/pemain memesan barang toko akademi. */
export const POST = route(async (req) => {
  const session = await requireSession();
  const b = await body(req, z.object({ lines: z.array(OrderLineInput).min(1, "Pilih minimal satu barang.").max(20), note: z.string().trim().max(200).optional() }));
  return ok({ id: await parentOrder(session, b.lines, b.note || null) }, 201);
});

export const DELETE = route(async (req) => {
  const session = await requireSession();
  const { orderId } = await body(req, z.object({ orderId: z.string().uuid() }));
  await parentCancel(session, orderId);
  return noContent();
});
