import type { SportId } from "./sports";

export type MetricType = "rating" | "number";
export interface Metric {
  key: string;
  label: string;
  type: MetricType;
  /** Satuan untuk angka, misalnya detik, cm, kali. */
  unit?: string | null;
  /** Untuk angka: lebih tinggi lebih baik (lompat) atau lebih rendah lebih baik (lari). */
  better: "higher" | "lower";
}

const physical: Metric[] = [
  { key: "sprint_20m", label: "Lari 20 meter", type: "number", unit: "detik", better: "lower" },
  { key: "vertical_jump", label: "Lompat tegak", type: "number", unit: "cm", better: "higher" },
  { key: "shuttle_run", label: "Lari bolak-balik", type: "number", unit: "detik", better: "lower" },
];
const attitude: Metric[] = [
  { key: "discipline", label: "Disiplin", type: "rating", better: "higher" },
  { key: "teamwork", label: "Kerja sama", type: "rating", better: "higher" },
];

const SKILLS: Record<SportId, Metric[]> = {
  football: [
    { key: "passing", label: "Mengoper", type: "rating", better: "higher" },
    { key: "dribbling", label: "Menggiring", type: "rating", better: "higher" },
    { key: "shooting", label: "Menendang ke gawang", type: "rating", better: "higher" },
    { key: "juggling", label: "Juggling", type: "number", unit: "kali", better: "higher" },
  ],
  futsal: [
    { key: "passing", label: "Mengoper", type: "rating", better: "higher" },
    { key: "control", label: "Kontrol bola", type: "rating", better: "higher" },
    { key: "shooting", label: "Menendang ke gawang", type: "rating", better: "higher" },
  ],
  basketball: [
    { key: "dribbling", label: "Dribel", type: "rating", better: "higher" },
    { key: "shooting", label: "Menembak", type: "rating", better: "higher" },
    { key: "free_throw", label: "Lemparan bebas masuk (dari 10)", type: "number", unit: "kali", better: "higher" },
  ],
  volleyball: [
    { key: "serve", label: "Servis", type: "rating", better: "higher" },
    { key: "pass", label: "Passing bawah", type: "rating", better: "higher" },
    { key: "spike", label: "Smash", type: "rating", better: "higher" },
  ],
  badminton: [
    { key: "footwork", label: "Footwork", type: "rating", better: "higher" },
    { key: "smash", label: "Smash", type: "rating", better: "higher" },
    { key: "netting", label: "Netting", type: "rating", better: "higher" },
  ],
  tennis: [
    { key: "forehand", label: "Forehand", type: "rating", better: "higher" },
    { key: "backhand", label: "Backhand", type: "rating", better: "higher" },
    { key: "serve", label: "Servis", type: "rating", better: "higher" },
  ],
  swimming: [
    { key: "free_50", label: "Gaya bebas 50 m", type: "number", unit: "detik", better: "lower" },
    { key: "breast_50", label: "Gaya dada 50 m", type: "number", unit: "detik", better: "lower" },
    { key: "technique", label: "Teknik gerakan", type: "rating", better: "higher" },
  ],
  other: [
    { key: "technique", label: "Teknik", type: "rating", better: "higher" },
    { key: "tactics", label: "Pemahaman bermain", type: "rating", better: "higher" },
  ],
};

/** Template bawaan untuk cabang olahraga akademi: keterampilan + fisik + sikap. */
export function defaultTemplate(sport: SportId): { name: string; description: string; metrics: Metric[] } {
  return {
    name: "Penilaian semester",
    description: "Keterampilan, tes fisik, dan sikap. Nilai 1-5 untuk keterampilan dan sikap; angka untuk tes fisik.",
    metrics: [...SKILLS[sport], ...(sport === "swimming" ? [] : physical), ...attitude],
  };
}
