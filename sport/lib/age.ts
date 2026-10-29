/** Umur dalam tahun penuh pada tanggal `on` (default hari ini). `birthDate` berformat YYYY-MM-DD. */
export function ageOf(birthDate: string, on = new Date()): number {
  const [y, m, d] = birthDate.split("-").map(Number) as [number, number, number];
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age--;
  return age;
}

export function ageRangeLabel(min: number | null, max: number | null): string | null {
  if (min !== null && max !== null) return min === max ? `Umur ${min}` : `Umur ${min}-${max}`;
  if (min !== null) return `Umur ${min}+`;
  if (max !== null) return `Sampai umur ${max}`;
  return null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
