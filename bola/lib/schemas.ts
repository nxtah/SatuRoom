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
