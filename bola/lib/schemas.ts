/** Aturan isian yang sama untuk form di browser dan API di server. */
import { z } from "zod";

export const email = z.string().trim().email("Format email belum benar.").max(254);
export const password = z
  .string()
  .min(8, "Password minimal 8 karakter.")
  .max(128, "Password maksimal 128 karakter.");

export const RegisterInput = z.object({
  name: z.string().trim().min(1, "Isi nama Anda.").max(100, "Nama terlalu panjang."),
  email,
  password,
});

export const LoginInput = z.object({
  email,
  password: z.string().min(1, "Isi password."),
});

export const EmailInput = z.object({ email });
export const TokenInput = z.object({ token: z.string().min(10).max(200) });
export const ResetInput = z.object({ token: z.string().min(10).max(200), password });
export const SwitchInput = z.object({ academyId: z.string().uuid() });

export const AcademyInput = z.object({
  name: z.string().trim().min(2, "Nama akademi minimal 2 huruf.").max(100, "Nama akademi terlalu panjang."),
  city: z.string().trim().min(2, "Isi kota akademi.").max(80, "Nama kota terlalu panjang."),
});

const optionalAge = z
  .union([z.coerce.number().int().min(3, "Umur minimal 3.").max(25, "Umur maksimal 25."), z.literal("")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const TeamInput = z
  .object({
    name: z.string().trim().min(1, "Isi nama tim.").max(60, "Nama tim terlalu panjang."),
    ageMin: optionalAge,
    ageMax: optionalAge,
  })
  .refine((t) => t.ageMin === null || t.ageMax === null || t.ageMin <= t.ageMax, {
    path: ["ageMax"],
    message: "Umur maksimal harus sama atau lebih besar dari umur minimal.",
  });

export const POSITIONS = [
  { id: "kiper", label: "Kiper" },
  { id: "belakang", label: "Belakang" },
  { id: "tengah", label: "Tengah" },
  { id: "depan", label: "Depan" },
] as const;

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

/** Tanggal lahir wajar untuk pemain akademi: umur 3 sampai 25 tahun. */
const birthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Isi tanggal lahir.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return false;
    const years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return years >= 3 && years <= 25;
  }, "Umur pemain harus antara 3 dan 25 tahun.");

export const PlayerInput = z.object({
  fullName: z.string().trim().min(2, "Isi nama lengkap pemain.").max(100, "Nama terlalu panjang."),
  birthDate,
  teamIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu tim.").max(5),
  position: z.preprocess(emptyToNull, z.enum(["kiper", "belakang", "tengah", "depan"]).nullable()).optional(),
  shirtNumber: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1, "Nomor 1-99.").max(99, "Nomor 1-99.").nullable(),
  ).optional(),
  guardianName: z.preprocess(emptyToNull, z.string().trim().max(100).nullable()).optional(),
  guardianPhone: z.preprocess(
    emptyToNull,
    z.string().trim().regex(/^\+?[0-9 -]{8,20}$/, "Nomor HP belum benar, contoh 0812 3456 7890.").nullable(),
  ).optional(),
});

export const PlayerStatusInput = z.object({ status: z.enum(["active", "inactive"]) });
