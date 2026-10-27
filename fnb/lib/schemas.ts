import { z } from "zod";
const name=z.string().trim().min(1,"Nama wajib diisi.").max(100);
export const CatalogInput=z.discriminatedUnion("type",[
  z.object({type:z.literal("category"),name}),
  z.object({type:z.literal("station"),name:name.max(60)}),
  z.object({type:z.literal("item"),name,description:z.string().trim().max(300).optional(),categoryId:z.string().uuid(),stationId:z.string().uuid().nullable(),price:z.coerce.number().int().min(0).max(100_000_000)}),
]);
export const AvailabilityInput=z.object({available:z.boolean()});
export const OrderInput=z.object({
  type:z.enum(["dine_in","takeaway","pickup"]),
  tableId:z.string().uuid().nullish(),
  customerName:z.string().trim().max(80).optional(),
  notes:z.string().trim().max(300).optional(),
  lines:z.array(z.object({
    menuItemId:z.string().uuid(),
    quantity:z.number().int().min(1).max(99),
    notes:z.string().trim().max(200).optional(),
  })).min(1,"Pilih minimal satu menu.").max(50),
});
export const OrderStatusInput=z.object({status:z.enum(["open","confirmed","preparing","ready","served","completed","cancelled"])});
export const LineStatusInput=z.object({status:z.enum(["preparing","ready"])});
