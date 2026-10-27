import { z } from "zod";
const name=z.string().trim().min(1,"Nama wajib diisi.").max(100);
export const CatalogInput=z.discriminatedUnion("type",[
  z.object({type:z.literal("category"),name}),
  z.object({type:z.literal("station"),name:name.max(60)}),
  z.object({type:z.literal("item"),name,description:z.string().trim().max(300).optional(),categoryId:z.string().uuid(),stationId:z.string().uuid().nullable(),price:z.coerce.number().int().min(0).max(100_000_000)}),
]);
export const AvailabilityInput=z.object({available:z.boolean()});
