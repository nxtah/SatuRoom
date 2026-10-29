/**
 * Cabang olahraga yang didukung. Semua menu dan fitur sama untuk semua cabang; cabang hanya
 * menentukan istilah (lapangan atau kolam), daftar posisi, dan warna aksen. Menambah cabang baru
 * cukup menambah satu entri di sini dan satu nilai di CHECK `academy_settings.sport`.
 */
export const SPORT_IDS = ["football", "futsal", "basketball", "volleyball", "badminton", "tennis", "swimming", "other"] as const;
export type SportId = (typeof SPORT_IDS)[number];

export interface Sport {
  id: SportId;
  /** Nama cabang, dipakai di pilihan dan judul. */
  label: string;
  /** Tempat latihan: "Lapangan", "Kolam", "Court". */
  venue: string;
  /** Nama lokasi awal saat akademi dibuat. */
  venueDefault: string;
  /** Posisi pemain; kosong bila cabang tidak mengenal posisi (isian posisi disembunyikan). */
  positions: readonly { id: string; label: string }[];
  /** Warna aksen tombol utama dan penanda aktif di aplikasi. Selalu dipasangkan dengan teks gelap. */
  accent: string;
  /** Berkas maskot di /brand. Cabang tanpa maskot khusus memakai maskot umum. */
  mascot: "bola" | "basket" | "umum";
  /** Satu kalimat untuk kartu pilihan. */
  blurb: string;
}

export const SPORTS: readonly Sport[] = [
  {
    id: "football",
    label: "Sepak bola",
    venue: "Lapangan",
    venueDefault: "Lapangan utama",
    positions: [
      { id: "kiper", label: "Kiper" },
      { id: "belakang", label: "Belakang" },
      { id: "tengah", label: "Tengah" },
      { id: "depan", label: "Depan" },
    ],
    accent: "#c8f53c",
    mascot: "bola",
    blurb: "SSB, akademi, dan klub usia dini.",
  },
  {
    id: "futsal",
    label: "Futsal",
    venue: "Lapangan",
    venueDefault: "Lapangan utama",
    positions: [
      { id: "kiper", label: "Kiper" },
      { id: "anchor", label: "Anchor" },
      { id: "flank", label: "Flank" },
      { id: "pivot", label: "Pivot" },
    ],
    accent: "#c8f53c",
    mascot: "bola",
    blurb: "Latihan indoor dengan tim kecil.",
  },
  {
    id: "basketball",
    label: "Basket",
    venue: "Lapangan",
    venueDefault: "Lapangan utama",
    positions: [
      { id: "point_guard", label: "Point guard" },
      { id: "shooting_guard", label: "Shooting guard" },
      { id: "small_forward", label: "Small forward" },
      { id: "power_forward", label: "Power forward" },
      { id: "center", label: "Center" },
    ],
    accent: "#ff9d2e",
    mascot: "basket",
    blurb: "Klub dan sekolah basket.",
  },
  {
    id: "volleyball",
    label: "Bola voli",
    venue: "Lapangan",
    venueDefault: "Lapangan utama",
    positions: [
      { id: "setter", label: "Setter" },
      { id: "outside_hitter", label: "Outside hitter" },
      { id: "middle_blocker", label: "Middle blocker" },
      { id: "opposite", label: "Opposite" },
      { id: "libero", label: "Libero" },
    ],
    accent: "#ffd84a",
    mascot: "umum",
    blurb: "Klub voli indoor dan pantai.",
  },
  {
    id: "badminton",
    label: "Bulu tangkis",
    venue: "Lapangan",
    venueDefault: "Lapangan utama",
    positions: [],
    accent: "#5ce1ff",
    mascot: "umum",
    blurb: "PB dan klub bulu tangkis.",
  },
  {
    id: "tennis",
    label: "Tenis",
    venue: "Court",
    venueDefault: "Court utama",
    positions: [],
    accent: "#dfff4a",
    mascot: "umum",
    blurb: "Akademi tenis dan klub court.",
  },
  {
    id: "swimming",
    label: "Renang",
    venue: "Kolam",
    venueDefault: "Kolam utama",
    positions: [],
    accent: "#4ae6d0",
    mascot: "umum",
    blurb: "Klub renang dan kursus anak.",
  },
  {
    id: "other",
    label: "Olahraga lain",
    venue: "Tempat latihan",
    venueDefault: "Tempat latihan utama",
    positions: [],
    accent: "#c8f53c",
    mascot: "umum",
    blurb: "Beladiri, atletik, senam, dan lainnya.",
  },
];

export const sportOf = (id: string | null | undefined): Sport => SPORTS.find((s) => s.id === id) ?? SPORTS[0]!;

export const positionLabel = (sport: SportId, id: string | null | undefined): string | undefined =>
  id ? (sportOf(sport).positions.find((p) => p.id === id)?.label ?? id) : undefined;
