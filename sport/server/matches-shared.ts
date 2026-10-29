/** Bagian pertandingan yang aman dipakai di browser (tanpa akses database). */
export type MatchResult = "W" | "D" | "L";

export const resultOf = (us: number | null, them: number | null): MatchResult | null =>
  us === null || them === null ? null : us > them ? "W" : us < them ? "L" : "D";
