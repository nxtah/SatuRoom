import type { Permission } from "@/server/permissions";

/** Penjelasan izin dengan bahasa sehari-hari, dikelompokkan supaya mudah dicentang. */
export const PERMISSION_LABEL: Record<Permission, { label: string; hint: string }> = {
  "academy.update": { label: "Ubah profil akademi", hint: "Nama, kota, alamat, logo, dan cabang olahraga." },
  "locations.manage": { label: "Kelola lokasi", hint: "Tambah dan ubah lapangan atau tempat latihan." },
  "staff.read": { label: "Lihat daftar staf", hint: "Melihat siapa saja staf dan perannya." },
  "staff.manage": { label: "Kelola staf", hint: "Mengundang, mengubah peran, dan menonaktifkan staf." },
  "roles.manage": { label: "Kelola peran", hint: "Membuat dan mengubah peran beserta izinnya." },
  "teams.read_all": { label: "Lihat semua tim", hint: "Tanpa ini hanya tim yang dipegang yang terlihat." },
  "teams.manage": { label: "Kelola tim", hint: "Membuat, mengubah, dan mengarsipkan tim." },
  "players.read_all": { label: "Lihat semua pemain", hint: "Tanpa ini hanya pemain di tim yang dipegang." },
  "players.manage": { label: "Kelola pemain", hint: "Menambah, mengubah data, dan menerima pendaftar." },
  "guardians.read": { label: "Lihat kontak orang tua", hint: "Nomor dan email orang tua/wali pemain." },
  "schedule.manage_all": { label: "Kelola semua jadwal", hint: "Tanpa ini hanya jadwal tim yang dipegang." },
  "attendance.record_all": { label: "Absen semua tim", hint: "Tanpa ini hanya tim yang dipegang." },
  "billing.read": { label: "Lihat iuran", hint: "Tagihan, tunggakan, dan pembayaran." },
  "billing.manage": { label: "Kelola iuran", hint: "Atur tarif, buat tagihan, dan catat pembayaran." },
  "announcements.manage": { label: "Kirim pengumuman", hint: "Membuat dan menghapus pengumuman." },
  "evaluations.write": { label: "Tulis rapor pemain", hint: "Menilai pemain di tim yang dipegang." },
  "evaluations.manage_all": { label: "Kelola semua rapor", hint: "Menilai dan mengubah rapor semua pemain." },
  "audit.read": { label: "Lihat jejak aktivitas", hint: "Siapa mengubah apa dan kapan." },
};

export const PERMISSION_GROUPS: { title: string; perms: Permission[] }[] = [
  { title: "Pemain dan tim", perms: ["players.read_all", "players.manage", "guardians.read", "teams.read_all", "teams.manage"] },
  { title: "Latihan", perms: ["schedule.manage_all", "attendance.record_all", "evaluations.write", "evaluations.manage_all"] },
  { title: "Keuangan", perms: ["billing.read", "billing.manage"] },
  { title: "Komunikasi", perms: ["announcements.manage"] },
  { title: "Tim kerja dan akses", perms: ["staff.read", "staff.manage", "roles.manage", "audit.read"] },
  { title: "Akademi", perms: ["academy.update", "locations.manage"] },
];
