const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const parts = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return { day: DAYS[d.getUTCDay()]!, date: d.getUTCDate(), month: MONTHS[d.getUTCMonth()]!, year: d.getUTCFullYear() };
};

/** "Selasa, 27 Okt" */
export function dayLabel(iso: string): string {
  const p = parts(iso);
  return `${p.day}, ${p.date} ${p.month}`;
}

/** "Selasa, 27 Okt 2026" */
export function longDate(iso: string): string {
  return `${dayLabel(iso)} ${parts(iso).year}`;
}

/** "26 Okt - 1 Nov 2026" */
export function weekLabel(monday: string, sunday: string): string {
  const a = parts(monday);
  const b = parts(sunday);
  return a.month === b.month ? `${a.date}-${b.date} ${b.month} ${b.year}` : `${a.date} ${a.month} - ${b.date} ${b.month} ${b.year}`;
}

export const shortDay = (iso: string) => parts(iso).day.slice(0, 3);
export const dayOfMonth = (iso: string) => parts(iso).date;

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "15.30" dari ISO waktu, memakai zona waktu tempat. */
export function clock(iso: string | Date, timeZone = "Asia/Jakarta"): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(new Date(iso)).replace(":", ".");
}

/** "1 j 25 mnt" dari jumlah menit. */
export function duration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h ? `${h} j ${String(m % 60).padStart(2, "0")} mnt` : `${m} mnt`;
}
