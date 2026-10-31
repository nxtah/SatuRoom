/** Aturan isian yang sama untuk form di browser dan API di server. */
import { z } from "zod";
import { SPORT_IDS } from "./sports";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

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
  /** ID bisnis; boleh kosong hanya untuk pengguna yang belum punya akademi. */
  businessCode: z.string().trim().max(20, "ID bisnis terlalu panjang.").optional(),
});

export const EmailInput = z.object({ email });
export const TokenInput = z.object({ token: z.string().min(10).max(200) });
export const ResetInput = z.object({ token: z.string().min(10).max(200), password });
export const SwitchInput = z.object({ academyId: z.string().uuid() });

export const AcademyInput = z.object({
  sport: z.enum(SPORT_IDS, "Pilih cabang olahraga.").default("football"),
  name: z.string().trim().min(2, "Nama akademi minimal 2 huruf.").max(100, "Nama akademi terlalu panjang."),
  city: z.string().trim().min(2, "Isi kota akademi.").max(80, "Nama kota terlalu panjang."),
  /** Alamat lengkap; tidak dikirim berarti tidak diubah. */
  address: z.string().trim().max(200, "Alamat terlalu panjang.").optional(),
});

export const UploadSignInput = z.object({ kind: z.enum(["logo"]) });
export const AcademyLogoInput = z.object({ logoUrl: z.string().trim().max(500).nullable() });

/** Umur opsional: isian kosong berarti tidak dibatasi. */
const optionalAge = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.coerce.number().int().min(3, "Umur minimal 3.").max(25, "Umur maksimal 25.").nullable(),
);

export const TeamInput = z
  .object({
    name: z.string().trim().min(1, "Isi nama tim.").max(60, "Nama tim terlalu panjang."),
    ageMin: optionalAge,
    ageMax: optionalAge,
    /** Lokasi latihan utama tim; menentukan cabang. Kosong = lokasi utama. */
    locationId: z.preprocess(emptyToNull, z.string().uuid().nullable()).optional(),
    /** Program latihan tim; kosong = tanpa program. */
    programId: z.preprocess(emptyToNull, z.string().uuid().nullable()).optional(),
  })
  .refine((t) => t.ageMin === null || t.ageMax === null || t.ageMin <= t.ageMax, {
    path: ["ageMax"],
    message: "Umur maksimal harus sama atau lebih besar dari umur minimal.",
  });


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
  position: z.preprocess(emptyToNull, z.string().trim().max(40).nullable()).optional(),
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

export const AnnouncementInput = z.object({
  title: z.string().trim().min(2, "Isi judul pengumuman.").max(100, "Judul terlalu panjang."),
  body: z.string().trim().min(2, "Isi pengumuman.").max(1000, "Pengumuman terlalu panjang (maksimal 1000 huruf)."),
  /** Kosong = untuk seluruh akademi. */
  teamId: z.preprocess(emptyToNull, z.string().uuid("Tim tidak valid.").nullable()).optional(),
});

/** Isian di halaman pendaftaran publik. `website` adalah jebakan untuk bot; manusia tidak melihatnya. */
export const PublicRegistrationInput = z.object({
  fullName: z.string().trim().min(2, "Isi nama lengkap calon pemain.").max(100, "Nama terlalu panjang."),
  birthDate,
  guardianName: z.string().trim().min(2, "Isi nama orang tua atau wali.").max(100, "Nama terlalu panjang."),
  guardianPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 -]{8,20}$/, "Nomor HP belum benar, contoh 0812 3456 7890."),
  note: z.preprocess(emptyToNull, z.string().trim().max(300, "Catatan terlalu panjang.").nullable()).optional(),
  consent: z.literal(true, "Centang persetujuan orang tua atau wali dulu."),
  website: z.string().max(200).optional(),
});

export const RegistrationApproveInput = z.object({
  teamIds: z.array(z.string().uuid()).min(1, "Pilih minimal satu tim.").max(5),
});
export const RegistrationRejectInput = z.object({
  reason: z.preprocess(emptyToNull, z.string().trim().max(200, "Alasan terlalu panjang.").nullable()).optional(),
});
export const RegistrationLinkInput = z.object({ enabled: z.boolean().optional(), rotate: z.boolean().optional() });


const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal.");
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Isi jam, contoh 15:30.");
const duration = z.coerce.number().int().min(15, "Minimal 15 menit.").max(300, "Maksimal 5 jam.");

export const WEEKDAYS = [
  { id: 1, short: "Sen", label: "Senin" },
  { id: 2, short: "Sel", label: "Selasa" },
  { id: 3, short: "Rab", label: "Rabu" },
  { id: 4, short: "Kam", label: "Kamis" },
  { id: 5, short: "Jum", label: "Jumat" },
  { id: 6, short: "Sab", label: "Sabtu" },
  { id: 7, short: "Min", label: "Minggu" },
] as const;

export const ScheduleInput = z.object({
  teamId: z.string().uuid("Pilih tim."),
  weekdays: z.array(z.coerce.number().int().min(1).max(7)).min(1, "Pilih minimal satu hari.").max(7),
  startTime: clock,
  durationMin: duration,
  startsOn: isoDate,
  /** Kosong = lokasi utama. */
  locationId: z.preprocess(emptyToNull, z.string().uuid("Lokasi tidak valid.").nullable()).optional(),
});

export const SessionInput = z.object({
  teamId: z.string().uuid("Pilih tim."),
  date: isoDate,
  startTime: clock,
  durationMin: duration,
  kind: z.enum(["training", "match"]),
  locationId: z.preprocess(emptyToNull, z.string().uuid("Lokasi tidak valid.").nullable()).optional(),
  title: z.preprocess(emptyToNull, z.string().trim().max(80, "Maksimal 80 karakter.").nullable()).optional(),
  /** Hanya dipakai untuk pertandingan; detail lain diisi di halaman sesi. */
  opponent: z.preprocess(emptyToNull, z.string().trim().min(2, "Nama lawan minimal 2 huruf.").max(80, "Nama lawan terlalu panjang.").nullable()).optional(),
});

/** Detail pertandingan: lawan, skor, catatan, dan susunan pemain (starter atau cadangan). */
const optionalScore = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.coerce.number().int("Skor berupa angka bulat.").min(0, "Skor tidak boleh minus.").max(999, "Skor terlalu besar.").nullable(),
);
export const MatchInput = z
  .object({
    opponent: z.preprocess(emptyToNull, z.string().trim().min(2, "Nama lawan minimal 2 huruf.").max(80, "Nama lawan terlalu panjang.").nullable()),
    homeAway: z.enum(["home", "away", "neutral"]),
    scoreUs: optionalScore,
    scoreThem: optionalScore,
    report: z.preprocess(emptyToNull, z.string().trim().max(500, "Maksimal 500 karakter.").nullable()),
    lineup: z
      .array(z.object({ playerId: z.string().uuid(), role: z.enum(["starter", "bench"]) }))
      .max(40, "Susunan terlalu banyak."),
  })
  .refine((m) => (m.scoreUs === null) === (m.scoreThem === null), {
    path: ["scoreThem"],
    message: "Isi skor kedua tim, atau kosongkan keduanya.",
  });

export const LocationInput = z.object({
  name: z.string().trim().min(2, "Nama lokasi minimal 2 huruf.").max(80, "Nama lokasi terlalu panjang."),
  /** Cabang pemilik lokasi; kosong = cabang utama. */
  branchId: z.preprocess(emptyToNull, z.string().uuid().nullable()).optional(),
  address: z.preprocess(emptyToNull, z.string().trim().max(200, "Alamat terlalu panjang.").nullable()).optional(),
});

export const CancelInput = z.object({
  reason: z.preprocess(emptyToNull, z.string().trim().max(200, "Maksimal 200 karakter.").nullable()).optional(),
});

export const ATTENDANCE = [
  { id: "present", short: "H", label: "Hadir" },
  { id: "excused", short: "I", label: "Izin" },
  { id: "sick", short: "S", label: "Sakit" },
  { id: "absent", short: "A", label: "Alpa" },
] as const;
export type AttendanceStatus = (typeof ATTENDANCE)[number]["id"];

export const AttendanceInput = z.object({
  entries: z
    .array(z.object({ playerId: z.string().uuid(), status: z.enum(["present", "excused", "sick", "absent"]) }))
    .min(1, "Tandai minimal satu pemain.")
    .max(300),
});
export const AttendanceQrScanInput = z.object({ token: z.string().min(20).max(200) });

const staffRoles = z.array(z.enum(["owner", "admin", "head_coach", "coach", "treasurer"])).max(5).default([]);
const teamIdList = z.array(z.string().uuid()).max(50).default([]);
const customRoleIdList = z.array(z.string().uuid()).max(20).default([]);
const branchIdList = z.array(z.string().uuid()).max(50).default([]);
const atLeastOneRole = (v: { roles: unknown[]; customRoleIds: unknown[] }) => v.roles.length + v.customRoleIds.length > 0;
const roleMessage = { message: "Pilih minimal satu peran.", path: ["roles"] };

export const InviteInput = z
  .object({ email, roles: staffRoles, customRoleIds: customRoleIdList, teamIds: teamIdList, branchIds: branchIdList })
  .refine(atLeastOneRole, roleMessage);
export const StaffUpdateInput = z
  .object({ roles: staffRoles, customRoleIds: customRoleIdList, teamIds: teamIdList, branchIds: branchIdList })
  .refine(atLeastOneRole, roleMessage);

export const CustomRoleInput = z.object({
  name: z.string().trim().min(2, "Nama peran minimal 2 huruf.").max(40, "Nama peran terlalu panjang."),
  description: z.string().trim().max(160, "Keterangan terlalu panjang.").optional(),
  permissions: z.array(z.string().min(3).max(40)).min(1, "Pilih minimal satu izin.").max(40),
});
export const StaffStatusInput = z.object({ status: z.enum(["active", "suspended"]) });
export const InvitationIdInput = z.object({ invitationId: z.string().uuid() });

const rupiah = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[^0-9]/g, "") : v),
  z.coerce.number().int().min(0, "Tidak boleh minus.").max(100_000_000, "Terlalu besar."),
);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pilih bulan.");

export const TeamFeeInput = z.object({ teamId: z.string().uuid(), amount: rupiah });
export const GenerateInvoicesInput = z.object({ month });
export const InvoicePayInput = z.object({ method: z.enum(["cash", "transfer", "other"]) });
export const InvoiceUpdateInput = z.object({
  action: z.enum(["pay", "unpay", "waive", "amount", "discount"]),
  method: z.enum(["cash", "transfer", "other"]).optional(),
  /** pay: jumlah dibayar (kosong = lunasi sisa); amount: tarif baru. */
  amount: rupiah.optional(),
  discount: rupiah.optional(),
  paidOn: z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()).optional(),
  accountId: z.preprocess(emptyToNull, z.string().uuid().nullable()).optional(),
  note: z.preprocess(emptyToNull, z.string().trim().max(120).nullable()).optional(),
});

export const PAYMENT_METHODS = [
  { id: "cash", label: "Tunai" },
  { id: "transfer", label: "Transfer" },
  { id: "other", label: "Lainnya" },
] as const;

export const NoticeInput = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["excused", "sick"]),
  note: z.string().trim().max(200, "Maksimal 200 karakter.").optional(),
});
export const PlayerInviteInput = z.object({ email });
export const AcceptPlayerInvitationInput = z.object({
  invitationId: z.string().uuid(),
  consentBy: z.string().trim().min(2, "Isi nama yang memberi persetujuan.").max(120),
});

const rating = z.coerce.number({ message: "Beri nilai 1 sampai 5." }).int().min(1, "Beri nilai 1 sampai 5.").max(5, "Beri nilai 1 sampai 5.");
export const EvaluationInput = z.object({
  period: z.string().trim().min(2, "Isi periode, misalnya Semester 1 2026.").max(60, "Periode terlalu panjang."),
  technique: rating,
  tactics: rating,
  fitness: rating,
  attitude: rating,
  strengths: z.string().trim().min(2, "Tulis hal yang sudah bagus.").max(500, "Terlalu panjang (maksimal 500 huruf)."),
  focus: z.string().trim().min(2, "Tulis hal yang perlu dilatih.").max(500, "Terlalu panjang (maksimal 500 huruf)."),
  /** Kirim langsung ke pemain, bukan simpan sebagai draf. */
  send: z.boolean().optional(),
});
export const EVALUATION_ASPECTS = [
  { id: "technique", label: "Teknik", hint: "Mengoper, menendang, mengontrol bola" },
  { id: "tactics", label: "Pemahaman bermain", hint: "Posisi, kerja sama, membaca permainan" },
  { id: "fitness", label: "Fisik", hint: "Stamina, kecepatan, kekuatan" },
  { id: "attitude", label: "Sikap", hint: "Disiplin, semangat, sportivitas" },
] as const;

export const BranchInput = z.object({
  name: z.string().trim().min(2, "Nama cabang minimal 2 huruf.").max(80, "Nama cabang terlalu panjang."),
  address: z.preprocess(emptyToNull, z.string().trim().max(200, "Alamat terlalu panjang.").nullable()).optional(),
  phone: z.preprocess(emptyToNull, z.string().trim().max(30, "Nomor terlalu panjang.").nullable()).optional(),
});
export const ModuleToggleInput = z.object({ module: z.string().regex(/^[a-z_]{2,40}$/), enabled: z.boolean() });

export const ProgramInput = z.object({
  name: z.string().trim().min(2, "Nama program minimal 2 huruf.").max(80, "Nama program terlalu panjang."),
  level: z.preprocess(emptyToNull, z.string().trim().max(40, "Level terlalu panjang.").nullable()).optional(),
  description: z.preprocess(emptyToNull, z.string().trim().max(500, "Keterangan terlalu panjang.").nullable()).optional(),
  monthlyFee: z.preprocess(
    (v) => (typeof v === "string" ? (v.replace(/[^0-9]/g, "") === "" ? null : Number(v.replace(/[^0-9]/g, ""))) : v),
    z.number().int().min(0).max(100_000_000, "Nominal terlalu besar.").nullable(),
  ).optional(),
});

const hhmm = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "Format jam 07:30.");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal.");

export const ShiftsInput = z.object({
  shifts: z
    .array(z.object({ weekday: z.coerce.number().int().min(1).max(7), start: hhmm, end: hhmm }))
    .max(7)
    .refine((list) => list.every((s) => s.end > s.start), "Jam pulang harus setelah jam masuk.")
    .refine((list) => new Set(list.map((s) => s.weekday)).size === list.length, "Satu hari hanya satu jadwal."),
});

export const StaffRequestInput = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("correction"), date: day, clockIn: hhmm, clockOut: z.preprocess(emptyToNull, hhmm.nullable()), reason: z.string().trim().min(3, "Tulis alasannya.").max(300) }),
  z.object({ kind: z.literal("leave"), dateFrom: day, dateTo: day, leaveType: z.enum(["annual", "sick", "personal", "unpaid"]), reason: z.string().trim().min(3, "Tulis alasannya.").max(300) }),
  z.object({ kind: z.literal("overtime"), date: day, minutes: z.coerce.number().int().min(15, "Minimal 15 menit.").max(960, "Maksimal 16 jam."), reason: z.string().trim().min(3, "Tulis alasannya.").max(300) }),
]);

export const StaffRequestDecisionInput = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.preprocess(emptyToNull, z.string().trim().max(200).nullable()).optional(),
});

const metricSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]{2,40}$/, "Kode ukuran tidak valid."),
  label: z.string().trim().min(2, "Isi nama ukuran.").max(60),
  type: z.enum(["rating", "number"]),
  unit: z.preprocess(emptyToNull, z.string().trim().max(20).nullable()).optional(),
  better: z.enum(["higher", "lower"]).default("higher"),
});
export const TemplateInput = z.object({
  name: z.string().trim().min(2, "Nama template minimal 2 huruf.").max(80),
  description: z.preprocess(emptyToNull, z.string().trim().max(300).nullable()).optional(),
  metrics: z
    .array(metricSchema)
    .min(1, "Tambahkan minimal satu ukuran.")
    .max(30, "Maksimal 30 ukuran.")
    .refine((m) => new Set(m.map((x) => x.key)).size === m.length, "Ada ukuran yang kembar."),
});
export const AssessmentInput = z.object({
  templateId: z.string().uuid(),
  assessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal."),
  values: z.record(z.string(), z.coerce.number().finite()),
  note: z.preprocess(emptyToNull, z.string().trim().max(1000).nullable()).optional(),
  send: z.boolean().optional(),
});
export const GoalInput = z.object({
  title: z.string().trim().min(2, "Tulis targetnya.").max(120),
  detail: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()).optional(),
  dueOn: z.preprocess(emptyToNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()).optional(),
  shared: z.boolean().default(true),
});
export const GoalStatusInput = z.object({ status: z.enum(["open", "achieved", "dropped"]) });

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pilih tanggal.");
const money = z.preprocess(
  (v) => (typeof v === "string" ? (v.replace(/[^0-9]/g, "") === "" ? undefined : Number(v.replace(/[^0-9]/g, ""))) : v),
  z.number({ message: "Isi nominal." }).int().min(1, "Isi nominal.").max(1_000_000_000, "Nominal terlalu besar."),
);
export const AccountInput = z.object({
  code: z.string().trim().regex(/^[0-9][0-9-]{0,9}$/, "Kode akun berupa angka, contoh 6-450."),
  name: z.string().trim().min(2, "Isi nama akun.").max(80),
  type: z.enum(["asset", "liability", "equity", "income", "expense"]),
  isCash: z.boolean().default(false),
});
export const ExpenseInput = z.object({
  spentOn: ymd,
  accountId: z.string().uuid({ message: "Pilih jenis biaya." }),
  paidFrom: z.string().uuid({ message: "Pilih dibayar dari mana." }),
  amount: money,
  vendor: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()).optional(),
  note: z.string().trim().min(2, "Tulis untuk apa.").max(200),
  branchId: z.preprocess(emptyToNull, z.string().uuid().nullable()).optional(),
});
export const ManualJournalInput = z.object({
  date: ymd,
  memo: z.string().trim().min(2, "Tulis keterangan.").max(200),
  lines: z
    .array(z.object({ accountId: z.string().uuid(), debit: z.coerce.number().int().min(0).default(0), credit: z.coerce.number().int().min(0).default(0) }))
    .min(2, "Minimal dua baris.")
    .max(20),
});
export const ScholarshipInput = z.object({
  playerId: z.string().uuid(),
  kind: z.enum(["percent", "amount"]),
  value: z.coerce.number().int().min(1, "Isi besarnya."),
  reason: z.string().trim().min(2, "Tulis alasannya.").max(120),
  startsOn: ymd,
  endsOn: z.preprocess(emptyToNull, ymd.nullable()).optional(),
});
export const PeriodLockInput = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), locked: z.boolean() });
export const ReconcileInput = z.object({
  accountId: z.string().uuid(),
  statementDate: ymd,
  statementBalance: z.coerce.number().int(),
  lineIds: z.array(z.string().uuid()).max(2000),
});
