/** Aturan isian yang sama untuk form di browser dan API di server. */
import { z } from "zod";

export const email = z.string().trim().email("Format email belum benar.").max(254);
export const password = z.string().min(8, "Password minimal 8 karakter.").max(128, "Password maksimal 128 karakter.");

export const RegisterInput = z.object({
  name: z.string().trim().min(1, "Isi nama Anda.").max(100, "Nama terlalu panjang."),
  email,
  password,
});

export const LoginInput = z.object({
  email,
  password: z.string().min(1, "Isi password."),
  /** ID bisnis; boleh kosong hanya untuk pengguna yang belum punya tempat. */
  businessCode: z.string().trim().max(20, "ID bisnis terlalu panjang.").optional(),
});

export const EmailInput = z.object({ email });
export const TokenInput = z.object({ token: z.string().min(10).max(200) });
export const ResetInput = z.object({ token: z.string().min(10).max(200), password });
export const SwitchInput = z.object({ venueId: z.string().uuid() });

export const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const uuid = z.string().uuid("Pilihan tidak valid.");
const optionalText = (max: number, msg = "Terlalu panjang.") => z.preprocess(emptyToNull, z.string().trim().max(max, msg).nullable()).optional();

/** Nomor telepon Indonesia disimpan sebagai angka saja, awalan 62 diganti 0. */
export const phone = z.preprocess(
  (v) => {
    if (typeof v !== "string" || v.trim() === "") return null;
    const d = v.replace(/[^0-9]/g, "");
    return d.startsWith("62") ? `0${d.slice(2)}` : d;
  },
  z.string().regex(/^[0-9]{8,15}$/, "Nomor telepon 8 sampai 15 angka.").nullable(),
);
const phoneRequired = phone.refine((v) => v !== null, "Isi nomor telepon.");

const money = (label: string, max = 10_000_000) =>
  z.coerce.number({ error: `${label} berupa angka.` }).int(`${label} berupa angka bulat.`).min(0, `${label} tidak boleh minus.`).max(max, `${label} terlalu besar.`);

export const VenueInput = z.object({
  name: z.string().trim().min(2, "Nama tempat minimal 2 huruf.").max(100, "Nama tempat terlalu panjang."),
  city: z.string().trim().min(2, "Isi kota.").max(80, "Nama kota terlalu panjang."),
});

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Isi jam, contoh 10:00.");

export const SettingsInput = z.object({
  billingStepMin: z.coerce.number().refine((v) => [10, 15, 30, 60].includes(v), "Pilih 10, 15, 30, atau 60 menit."),
  minMinutes: z.coerce.number().int().min(0, "Minimal 0.").max(240, "Maksimal 240 menit."),
  openTime: clockTime,
  closeTime: clockTime,
  discountSilver: z.coerce.number().int().min(0).max(50, "Maksimal 50%."),
  discountGold: z.coerce.number().int().min(0).max(50, "Maksimal 50%."),
  publicBooking: z.coerce.boolean(),
});

export const TableInput = z.object({
  name: z.string().trim().min(1, "Isi nama meja.").max(40, "Nama meja terlalu panjang."),
  kind: z.enum(["auto", "manual", "vip"], "Pilih jenis meja."),
  seats: z.coerce.number().int().min(2, "Minimal 2 kursi.").max(8, "Maksimal 8 kursi."),
  ratePerHour: money("Tarif"),
  isMaintenance: z.coerce.boolean().optional(),
});

export const MemberInput = z.object({
  fullName: z.string().trim().min(2, "Nama minimal 2 huruf.").max(100, "Nama terlalu panjang."),
  phone,
  tier: z.enum(["regular", "silver", "gold"], "Pilih tingkat member."),
  note: optionalText(300, "Maksimal 300 karakter."),
});

export const TopUpInput = z.object({
  amount: money("Nominal", 50_000_000).refine((v) => v >= 1000, "Minimal Rp 1.000."),
  method: z.enum(["cash", "qris", "transfer"], "Pilih cara bayar."),
  note: optionalText(200),
});

export const MenuInput = z.object({
  name: z.string().trim().min(1, "Isi nama menu.").max(80, "Nama menu terlalu panjang."),
  category: z.enum(["drink", "food", "snack", "other"], "Pilih kategori."),
  price: money("Harga"),
  stock: z.preprocess(emptyToNull, z.coerce.number().int().min(0, "Stok tidak boleh minus.").max(100000).nullable()).optional(),
  isAvailable: z.coerce.boolean().optional(),
});

export const OpenSessionInput = z.object({
  tableId: uuid,
  memberId: z.preprocess(emptyToNull, uuid.nullable()).optional(),
  guestName: optionalText(80),
  players: z.coerce.number().int().min(1, "Minimal 1 pemain.").max(8, "Maksimal 8 pemain."),
  bookingId: z.preprocess(emptyToNull, uuid.nullable()).optional(),
});

export const OrderInput = z.object({
  menuItemId: uuid,
  qty: z.coerce.number().int().min(1, "Minimal 1.").max(99, "Maksimal 99."),
});

export const SessionPatchInput = z
  .object({
    memberId: z.preprocess(emptyToNull, uuid.nullable()).optional(),
    guestName: optionalText(80),
    players: z.coerce.number().int().min(1).max(8).optional(),
    moveToTableId: uuid.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Tidak ada yang diubah.");

export const CloseSessionInput = z.object({
  payments: z
    .array(z.object({ method: z.enum(["cash", "qris", "transfer", "balance"]), amount: z.coerce.number().int().min(1, "Nominal minimal Rp 1.").max(100_000_000) }))
    .max(6, "Terlalu banyak pembayaran."),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal.");
const duration = z.coerce.number().int().min(60, "Minimal 1 jam.").max(480, "Maksimal 8 jam.");

export const BookingInput = z.object({
  tableId: z.preprocess(emptyToNull, uuid.nullable()).optional(),
  memberId: z.preprocess(emptyToNull, uuid.nullable()).optional(),
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(80, "Nama terlalu panjang."),
  phone,
  date: isoDate,
  startTime: clockTime,
  durationMin: duration,
  pax: z.coerce.number().int().min(1, "Minimal 1 orang.").max(8, "Maksimal 8 orang."),
  deposit: money("Uang muka", 10_000_000).optional(),
  note: optionalText(200),
});

export const BookingStatusInput = z.object({
  status: z.enum(["cancelled", "no_show"]),
});

export const AssignBookingInput = z.object({ tableId: uuid });

export const PublicBookingInput = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 huruf.").max(80, "Nama terlalu panjang."),
  phone: phoneRequired,
  date: isoDate,
  startTime: clockTime,
  durationMin: duration,
  pax: z.coerce.number().int().min(1).max(8),
  note: optionalText(200),
});

export const TournamentInput = z.object({
  name: z.string().trim().min(2, "Nama turnamen minimal 2 huruf.").max(100, "Nama terlalu panjang."),
  eventDate: isoDate,
  entryFee: money("Biaya daftar", 100_000_000),
  rounds: z.coerce.number().int().min(1, "Minimal 1 babak.").max(12, "Maksimal 12 babak."),
  rankPoints: z
    .array(z.coerce.number().int().min(0).max(100))
    .length(4, "Isi poin untuk peringkat 1 sampai 4.")
    .refine((p) => p.every((v, i) => i === 0 || v <= p[i - 1]!), "Poin peringkat harus menurun."),
  note: optionalText(300),
});

export const EntrantInput = z
  .object({
    memberId: z.preprocess(emptyToNull, uuid.nullable()).optional(),
    name: optionalText(80),
  })
  .refine((v) => v.memberId || (typeof v.name === "string" && v.name.length >= 2), { path: ["name"], message: "Isi nama peserta atau pilih member." });

export const ScoresInput = z.object({
  roundNo: z.coerce.number().int().min(1).max(12),
  tableNo: z.coerce.number().int().min(1).max(100),
  scores: z.array(z.object({ playerId: uuid, score: z.preprocess(emptyToNull, z.coerce.number().int().min(-100000).max(1000000).nullable()) })).min(2).max(4),
});

export const InviteInput = z.object({
  email,
  roles: z.array(z.enum(["owner", "manager", "host", "server", "referee"])).min(1, "Pilih minimal satu peran.").max(5),
});

export const StaffUpdateInput = z.object({
  roles: z.array(z.enum(["owner", "manager", "host", "server", "referee"])).min(1, "Pilih minimal satu peran.").max(5),
});

export const InvitationIdInput = z.object({ invitationId: z.string().uuid() });
export const StaffStatusInput = z.object({ status: z.enum(["active", "suspended"]) });
export const EntrantPatchInput = z.object({ paid: z.boolean() });
export const BookingPatchInput = z.union([BookingStatusInput, AssignBookingInput]);
export const OrderPatchInput = z.object({ status: z.enum(["served", "void"]) });
