/**
 * Modul yang bisa dinyalakan/dimatikan pemilik. Inti (tim, pemain, jadwal, absensi latihan, staf)
 * selalu menyala. `requires`: modul lain yang harus menyala. `hrefs`: menu yang ikut tersembunyi.
 */
export const MODULES = [
  { key: "billing", label: "Iuran dan tagihan", hint: "Tarif, tagihan bulanan, pembayaran, beasiswa.", requires: [], hrefs: ["/iuran"] },
  { key: "announcements", label: "Pengumuman", hint: "Kabar untuk pemain dan orang tua.", requires: [], hrefs: ["/pengumuman"] },
  { key: "evaluations", label: "Rapor dan penilaian", hint: "Rapor pelatih, template penilaian per cabang, target perkembangan.", requires: [], hrefs: ["/penilaian"] },
  { key: "matches", label: "Pertandingan", hint: "Skor, susunan pemain, dan hasil pertandingan.", requires: [], hrefs: [] },
  { key: "registrations", label: "Pendaftaran online", hint: "Link formulir untuk calon pemain.", requires: [], hrefs: ["/pemain/pendaftar"] },
  { key: "programs", label: "Program latihan", hint: "Program, level, dan kelompok latihan.", requires: [], hrefs: ["/program"] },
  { key: "staff_attendance", label: "Absensi staf", hint: "Jadwal kerja, absen masuk/pulang, cuti, lembur.", requires: [], hrefs: ["/absensi-staf"] },
  { key: "payroll", label: "Gaji", hint: "Komponen gaji, proses gaji bulanan, slip gaji.", requires: ["staff_attendance", "accounting"], hrefs: ["/gaji"] },
  { key: "accounting", label: "Keuangan dan akuntansi", hint: "Pengeluaran, kas/bank, jurnal, laporan keuangan.", requires: [], hrefs: ["/keuangan"] },
  { key: "inventory", label: "Stok dan pembelian", hint: "Barang, supplier, pembelian, stok opname, aset.", requires: ["accounting"], hrefs: ["/stok"] },
  { key: "store", label: "Toko", hint: "Jual jersey, perlengkapan, dan pesanan orang tua.", requires: ["inventory"], hrefs: ["/toko"] },
  { key: "events", label: "Event dan turnamen", hint: "Event, pendaftaran peserta, turnamen, klasemen.", requires: [], hrefs: ["/event"] },
  { key: "support", label: "Layanan orang tua", hint: "Pertanyaan, keluhan, dan masukan dari orang tua.", requires: [], hrefs: ["/layanan"] },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export const MODULE_KEYS = MODULES.map((m) => m.key) as ModuleKey[];
export const moduleOf = (key: ModuleKey) => MODULES.find((m) => m.key === key)!;

/** Modul yang efektif menyala: dimatikan sendiri atau bergantung pada modul yang mati = mati. */
export function effectiveModules(disabled: readonly string[]): Set<ModuleKey> {
  const on = new Set<ModuleKey>(MODULE_KEYS.filter((k) => !disabled.includes(k)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of MODULES) {
      if (on.has(m.key) && m.requires.some((r) => !on.has(r as ModuleKey))) {
        on.delete(m.key);
        changed = true;
      }
    }
  }
  return on;
}
