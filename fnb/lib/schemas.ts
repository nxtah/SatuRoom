import { z } from "zod";
import { BUILTIN_ROLES, PERMISSIONS } from "./permissions";
const name=z.string().trim().min(1,"Nama wajib diisi.").max(100);
const rupiah=z.coerce.number().int().min(0).max(100_000_000);
const skuField=z.string().trim().regex(/^[A-Za-z0-9._-]{1,40}$/,"SKU hanya huruf, angka, titik, minus, dan garis bawah (maks 40).");
const imageField=z.string().trim().max(500).nullish();
/** Isian lengkap sebuah menu. Semua opsional agar pemanggil lama (kasir cepat, tes) tetap jalan. */
export const itemExtras={
  sku:skuField.nullish().or(z.literal("")),
  barcode:z.string().trim().min(1).max(40).nullish().or(z.literal("")),
  cost:rupiah.optional(),
  trackStock:z.boolean().optional(),
  minStock:z.coerce.number().int().min(0).max(1_000_000).optional(),
  imageUrl:imageField,
  showInPos:z.boolean().optional(),
  taxable:z.boolean().optional(),
};
export const CatalogInput=z.discriminatedUnion("type",[
  z.object({type:z.literal("category"),name,description:z.string().trim().max(200).nullish(),imageUrl:imageField}),
  z.object({type:z.literal("station"),name:name.max(60)}),
  z.object({type:z.literal("item"),name,description:z.string().trim().max(300).optional(),categoryId:z.string().uuid(),stationId:z.string().uuid().nullable(),price:z.coerce.number().int().min(0).max(100_000_000),...itemExtras}),
]);
export const UploadSignInput=z.object({kind:z.enum(["menu","kategori","addon","struk"])});
export const CategoryUpdateInput=z.object({name,description:z.string().trim().max(200).nullish(),imageUrl:imageField,isActive:z.boolean().default(true),sortOrder:z.coerce.number().int().min(0).max(10_000).default(0)});
export const ItemStockInput=z.object({
  quantity:z.coerce.number().int().refine((v)=>v!==0,"Jumlah tidak boleh nol.").refine((v)=>Math.abs(v)<=1_000_000,"Jumlah terlalu besar."),
  reason:z.string().trim().min(2,"Alasan wajib diisi.").max(120),
});
export const AvailabilityInput=z.object({available:z.boolean()});
export const OrderInput=z.object({
  type:z.enum(["dine_in","takeaway","pickup"]),
  tableId:z.string().uuid().nullish(),
  customerName:z.string().trim().max(80).optional(),
  notes:z.string().trim().max(300).optional(),
  discountType:z.enum(["amount","percent"]).nullish(),
  discountValue:z.number().min(0).max(100_000_000).optional(),
  discountReason:z.string().trim().max(200).optional(),
  idempotencyKey:z.string().trim().min(8).max(80).optional(),
  customerId:z.string().uuid().nullish(),
  voucherCode:z.string().trim().toUpperCase().max(20).optional(),
  lines:z.array(z.object({
    menuItemId:z.string().uuid(),
    quantity:z.number().int().min(1).max(99),
    notes:z.string().trim().max(200).optional(),
    modifierIds:z.array(z.string().uuid()).max(40).default([]),
  })).min(1,"Pilih minimal satu menu.").max(50),
});
export const OrderStatusInput=z.object({status:z.enum(["open","confirmed","preparing","ready","served","completed","cancelled"]),reason:z.string().trim().max(200).optional()});
export const LineStatusInput=z.object({status:z.enum(["preparing","ready"])});
export const PaymentInput=z.object({
  orderId:z.string().uuid(),
  amount:z.coerce.number().int().min(1,"Nominal wajib diisi.").max(100_000_000),
  method:z.enum(["cash","transfer","qris","card","other"]),
  tendered:z.coerce.number().int().min(0).max(100_000_000).optional(),
  idempotencyKey:z.string().trim().min(8).max(80).optional(),
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
export const StockWasteInput=z.object({
  quantity:z.coerce.number().positive("Jumlah harus lebih dari nol.").max(1_000_000),
  reason:z.string().trim().min(2,"Alasan wajib diisi.").max(120),
});
export const StockCountInput=z.object({
  counted:z.coerce.number().min(0,"Hasil hitung tidak boleh negatif.").max(1_000_000),
  note:z.string().trim().max(120).optional(),
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

export const CustomRoleInput = z.object({
  name: z.string().trim().min(2, "Nama peran minimal 2 huruf.").max(40, "Nama peran terlalu panjang."),
  permissions: z.array(z.enum(PERMISSIONS)).min(1, "Pilih minimal satu izin.").max(PERMISSIONS.length),
});

export const StaffRolesInput = z
  .object({
    roles: z.array(z.enum(BUILTIN_ROLES)).max(BUILTIN_ROLES.length),
    customRoleIds: z.array(z.string().uuid()).max(20),
  })
  .refine((v) => v.roles.length + v.customRoleIds.length > 0, "Pilih minimal satu peran.");

export const StaffStatusInput = z.object({ status: z.enum(["active", "suspended"]) });

const email = z.string().trim().email("Format email belum benar.").max(254);
export const EmailInput = z.object({ email });
export const TokenInput = z.object({ token: z.string().min(10).max(200) });
export const ResetInput = z.object({ token: z.string().min(10).max(200), password: z.string().min(8, "Password minimal 8 karakter.").max(128) });
export const InviteInput = z
  .object({
    email,
    roles: z.array(z.enum(BUILTIN_ROLES)).max(BUILTIN_ROLES.length),
    customRoleIds: z.array(z.string().uuid()).max(20),
  })
  .refine((v) => v.roles.length + v.customRoleIds.length > 0, "Pilih minimal satu peran.");
export const InvitationIdInput = z.object({ invitationId: z.string().uuid() });

const uuid = z.string().uuid();
export const ItemUpdateInput = z.object({
  name,
  description: z.string().trim().max(300).nullish(),
  categoryId: uuid,
  stationId: uuid.nullable(),
  price: z.coerce.number().int().min(0).max(100_000_000),
  ...itemExtras,
});
export const ModifierGroupInput = z
  .object({
    id: uuid.optional(),
    name: name.max(60),
    description: z.string().trim().max(200).nullish(),
    minSelect: z.coerce.number().int().min(0).max(20),
    maxSelect: z.coerce.number().int().min(1).max(20),
    modifiers: z
      .array(z.object({
        id: uuid.optional(), name: name.max(60), priceDelta: z.coerce.number().int().min(0).max(10_000_000), available: z.boolean().default(true),
        sku: skuField.nullish().or(z.literal("")), cost: z.coerce.number().int().min(0).max(10_000_000).default(0), imageUrl: imageField,
        ingredientId: uuid.nullish(), ingredientQty: z.coerce.number().positive().max(1_000_000).nullish(),
      }).refine((m) => !!m.ingredientId === !!m.ingredientQty, { path: ["ingredientQty"], message: "Isi bahan dan jumlah pemakaian bersamaan." }))
      .min(1, "Isi minimal satu opsi.")
      .max(40),
  })
  .refine((g) => g.maxSelect >= g.minSelect, { path: ["maxSelect"], message: "Maksimal pilihan tidak boleh lebih kecil dari minimal." })
  .refine((g) => g.minSelect <= g.modifiers.length, { path: ["minSelect"], message: "Minimal pilihan melebihi jumlah opsi." });
export const ItemGroupsInput = z.object({ groupIds: z.array(uuid).max(20) });

export const SettingsInput = z.object({
  taxPercent: z.coerce.number().min(0, "Pajak tidak boleh minus.").max(100, "Maksimal 100%."),
  servicePercent: z.coerce.number().min(0, "Service tidak boleh minus.").max(100, "Maksimal 100%."),
  receiptPrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,8}$/, "Awalan nomor struk 1 sampai 8 huruf atau angka."),
  receiptHeader: z.string().trim().max(200).nullish(),
  receiptFooter: z.string().trim().max(200).nullish(),
});
export const CashMovementInput = z.object({
  kind: z.enum(["in", "out"]),
  amount: z.coerce.number().int().min(1, "Nominal minimal Rp 1.").max(100_000_000),
  category: z.string().trim().min(2, "Isi kategori.").max(40),
  reason: z.string().trim().min(3, "Alasan wajib diisi.").max(200),
});
export const RefundInput = z.object({
  amount: z.coerce.number().int().min(1, "Nominal minimal Rp 1.").max(100_000_000),
  reason: z.string().trim().min(3, "Alasan wajib diisi.").max(200),
});

export const TableInput=z.object({
  name:z.string().trim().min(1,"Nama meja wajib diisi.").max(40),
  capacity:z.coerce.number().int().min(1).max(500).nullish(),
});
export const MoveOrderInput=z.object({tableId:z.string().uuid()});
export const MergeOrderInput=z.object({targetId:z.string().uuid()});
export const SplitOrderInput=z.object({lineIds:z.array(z.string().uuid()).min(1).max(100)});

export const ExpenseInput=z.object({
  amount:z.coerce.number().int().min(1,"Nominal minimal Rp 1.").max(1_000_000_000),
  category:z.string().trim().min(2,"Isi kategori.").max(40),
  note:z.string().trim().max(200).nullish(),
  spentOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/,"Tanggal tidak valid.").optional(),
  fromDrawer:z.boolean().default(false),
});
export const ExpenseVoidInput=z.object({reason:z.string().trim().min(3,"Alasan wajib diisi.").max(200)});

export const CustomerInput=z.object({
  name:z.string().trim().min(1,"Nama wajib diisi.").max(80),
  phone:z.string().trim().regex(/^\+?[0-9 -]{8,20}$/,"Nomor telepon tidak valid.").nullish().or(z.literal("").transform(()=>null)),
  notes:z.string().trim().max(200).nullish(),
});
export const VoucherInput=z.object({
  code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,20}$/,"Kode 3-20 huruf besar, angka, - atau _."),
  kind:z.enum(["percent","amount"]),
  value:z.coerce.number().int().min(1,"Nilai minimal 1."),
  minSpend:z.coerce.number().int().min(0).default(0),
  maxUses:z.coerce.number().int().min(1).nullish(),
  startsOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal("").transform(()=>null)),
  endsOn:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal("").transform(()=>null)),
}).refine((v)=>v.kind!=="percent"||v.value<=100,{message:"Persen maksimal 100.",path:["value"]});
export const VoucherActiveInput=z.object({active:z.boolean()});
export const VoucherCheckInput=z.object({code:z.string().trim().toUpperCase().min(1).max(20),subtotal:z.number().int().min(0)});
