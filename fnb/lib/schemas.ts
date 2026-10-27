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
export const PaymentInput=z.object({
  orderId:z.string().uuid(),
  amount:z.coerce.number().int().min(1,"Nominal wajib diisi.").max(100_000_000),
  method:z.enum(["cash","transfer","qris","card","other"]),
});
export const VoidPaymentInput=z.object({reason:z.string().trim().min(3,"Alasan wajib diisi.").max(200)});
export const ShiftOpenInput=z.object({openingCash:z.coerce.number().int().min(0).max(100_000_000)});
export const ShiftCloseInput=z.object({
  closingCash:z.coerce.number().int().min(0).max(100_000_000),
  notes:z.string().trim().max(300).optional(),
});
export const IngredientInput=z.object({
  name:z.string().trim().min(1,"Nama wajib diisi.").max(100),
  unit:z.string().trim().min(1,"Satuan wajib diisi.").max(20),
  minimumStock:z.coerce.number().min(0).max(1_000_000).optional(),
  averageCost:z.coerce.number().int().min(0).max(100_000_000).optional(),
  openingStock:z.coerce.number().min(0).max(1_000_000).optional(),
});
export const StockAdjustInput=z.object({
  quantity:z.coerce.number().refine((v)=>v!==0,"Jumlah tidak boleh nol."),
  reason:z.string().trim().min(2,"Alasan wajib diisi.").max(120),
});
export const RecipeInput=z.object({
  menuItemId:z.string().uuid(),
  lines:z.array(z.object({ingredientId:z.string().uuid(),quantity:z.coerce.number().positive().max(1_000_000)})).max(50),
});
export const SupplierInput=z.object({
  name:z.string().trim().min(2,"Nama supplier wajib diisi.").max(100),
  phone:z.preprocess(v=>(typeof v==="string"&&v.trim()===""?undefined:v),z.string().trim().regex(/^\+?[0-9 -]{8,20}$/,"Nomor HP belum benar.").optional()),
});
export const PurchaseInput=z.object({
  supplierId:z.string().uuid().nullish(),
  notes:z.string().trim().max(300).optional(),
  lines:z.array(z.object({
    ingredientId:z.string().uuid("Pilih bahan."),
    quantity:z.coerce.number().positive("Jumlah harus lebih dari nol.").max(1_000_000),
    unitCost:z.coerce.number().int().min(0).max(100_000_000),
  })).min(1,"Isi minimal satu bahan.").max(50),
});
