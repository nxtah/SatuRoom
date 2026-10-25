import Link from "next/link";
import { dayOfMonth } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import type { HomeStats } from "@/server/stats";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const weekLabel = (iso: string) => `${dayOfMonth(iso)} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

function Tile({ href, label, value, note, accent }: { href: string; label: string; value: string; note: string; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex flex-col justify-between gap-3 rounded-[1.75rem] p-5 transition hover:-translate-y-0.5 ${
        accent ? "bg-sun" : "bg-chalk"
      }`}
    >
      <span className={`text-sm font-bold ${accent ? "text-ink/70" : "text-ink-soft"}`}>{label}</span>
      <span>
        <span className="block text-3xl leading-none font-extrabold tracking-tight">{value}</span>
        <span className={`mt-1.5 block text-sm ${accent ? "text-ink/70" : "text-ink-soft"}`}>{note}</span>
      </span>
    </Link>
  );
}

/** Ubin angka utama di Beranda. */
export function StatTiles({ stats, billing }: { stats: HomeStats; billing: { billed: number; collected: number } | null }) {
  const paidPct = billing && billing.billed ? Math.round((billing.collected / billing.billed) * 100) : null;
  return (
    <section aria-label="Ringkasan" className="rise grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        href="/pemain"
        label="Pemain aktif"
        value={String(stats.activePlayers)}
        note={stats.newPlayersThisMonth ? `+${stats.newPlayersThisMonth} bulan ini` : "Belum ada yang baru bulan ini"}
      />
      <Tile
        href="/jadwal"
        label="Kehadiran 30 hari"
        value={stats.attendanceRate === null ? "-" : `${stats.attendanceRate}%`}
        note={stats.attendanceRate === null ? "Belum ada absensi" : "dari absensi tercatat"}
        accent
      />
      <Tile
        href="/jadwal"
        label="Latihan minggu ini"
        value={String(stats.sessionsThisWeek)}
        note={`${stats.sessionsRecordedThisWeek} sudah diabsen`}
      />
      {billing ? (
        <Tile
          href="/iuran"
          label="Iuran terkumpul"
          value={paidPct === null ? "-" : `${paidPct}%`}
          note={billing.billed ? `${rupiah(billing.collected)} dari ${rupiah(billing.billed)}` : "Belum ada tagihan"}
        />
      ) : (
        <Tile href="/tim" label="Tim" value={String(stats.perTeam.length)} note="tim aktif" />
      )}
    </section>
  );
}

/** Tren kehadiran mingguan (satu seri) dan kehadiran per tim. */
export function AttendanceWidgets({ stats }: { stats: HomeStats }) {
  // Sorot minggu terakhir yang sudah ada absensinya (minggu berjalan bisa masih kosong).
  const latest = stats.weekly.findLastIndex((w) => w.rate !== null);
  if (latest < 0) return null;
  const edge = (i: number) =>
    i === 0 ? "left-0" : i === stats.weekly.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <section className="rise grid gap-3 lg:grid-cols-[1.4fr_1fr]" aria-label="Statistik kehadiran">
      <figure className="rounded-[2rem] bg-chalk p-6">
        <figcaption>
          <span className="block text-lg font-extrabold">Kehadiran per minggu</span>
          <span className="block text-sm text-ink-soft">Persentase hadir, 6 minggu terakhir</span>
        </figcaption>
        <div className="relative mt-5 h-40">
          {/* Garis bantu 50% dan 100%, sangat samar. */}
          <div aria-hidden className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
          <div aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
          <ol className="relative flex h-full items-end gap-[2px]" aria-hidden>
            {stats.weekly.map((w, i) => {
              const last = i === latest;
              return (
                <li key={w.weekStart} className="group relative flex h-full flex-1 items-end justify-center" tabIndex={0}>
                  {w.rate === null ? (
                    <span className="mb-0 h-1 w-full max-w-10 rounded-full bg-line" />
                  ) : (
                    <span
                      className={`w-full max-w-10 rounded-t-[4px] transition group-hover:opacity-80 ${last ? "bg-turf" : "bg-turf/45"}`}
                      style={{ height: `${Math.max(w.rate, 2)}%` }}
                    />
                  )}
                  <span className={`pointer-events-none absolute bottom-full z-10 mb-1 rounded-xl bg-ink px-2.5 py-1.5 text-xs font-bold whitespace-nowrap text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 ${edge(i)}`}>
                    {w.rate === null ? "Belum ada absensi" : `${w.rate}% hadir`}
                    <span className="block font-semibold text-white/70">Minggu {weekLabel(w.weekStart)}</span>
                  </span>
                  {last && w.rate !== null ? (
                    <span className="absolute -top-6 text-sm font-extrabold text-ink">{w.rate}%</span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
        <div aria-hidden className="mt-2 flex gap-[2px] text-center text-xs font-semibold text-ink-soft">
          {stats.weekly.map((w) => (
            <span key={w.weekStart} className="flex-1">
              {weekLabel(w.weekStart)}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>Kehadiran per minggu</caption>
          <tbody>
            {stats.weekly.map((w) => (
              <tr key={w.weekStart}>
                <th scope="row">Minggu {weekLabel(w.weekStart)}</th>
                <td>{w.rate === null ? "belum ada absensi" : `${w.rate}% hadir`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>

      <figure className="rounded-[2rem] bg-chalk p-6">
        <figcaption>
          <span className="block text-lg font-extrabold">Kehadiran per tim</span>
          <span className="block text-sm text-ink-soft">30 hari terakhir</span>
        </figcaption>
        <ul className="mt-5 grid gap-4">
          {stats.perTeam.map((t) => (
            <li key={t.teamId}>
              <Link href={`/tim/${t.teamId}`} className="group block">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-bold group-hover:underline">{t.teamName}</span>
                  <span className="shrink-0 font-extrabold">{t.rate === null ? "-" : `${t.rate}%`}</span>
                </span>
                <span className="mt-1.5 block h-2.5 overflow-hidden rounded-full bg-mist" aria-hidden>
                  <span className="block h-full rounded-full bg-turf" style={{ width: `${t.rate ?? 0}%` }} />
                </span>
                <span className="mt-1 block text-xs text-ink-soft">{t.players} pemain aktif</span>
              </Link>
            </li>
          ))}
        </ul>
      </figure>
    </section>
  );
}
