import Link from "next/link";
import { dayOfMonth } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import { AreaTrend, Ring, Sparkline } from "@/components/charts";
import type { HomeStats } from "@/server/stats";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const weekLabel = (iso: string) => `${dayOfMonth(iso)} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;

function Tile({
  href,
  label,
  value,
  note,
  tone = "plain",
  className = "",
  children,
}: {
  href: string;
  label: string;
  value: string;
  note: string;
  tone?: "plain" | "ember" | "pitch";
  className?: string;
  children?: React.ReactNode;
}) {
  const skin = { plain: "bg-chalk text-ink", ember: "bg-ember text-ink", pitch: "bg-pitch text-white" }[tone];
  const soft = tone === "pitch" ? "text-white/70" : tone === "ember" ? "text-ink/75" : "text-ink-soft";
  return (
    <Link
      href={href}
      className={`group relative flex min-h-36 flex-col justify-between gap-4 overflow-hidden rounded-[1.75rem] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-26px_rgb(11_26_58/0.6)] ${skin} ${className}`}
    >
      <span className={`text-sm font-bold ${soft}`}>{label}</span>
      <span className="flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-4xl leading-none font-extrabold tracking-tight tabular-nums">{value}</span>
          <span className={`mt-2 block text-sm ${soft}`}>{note}</span>
        </span>
        {children}
      </span>
    </Link>
  );
}

/** Ubin angka utama di Beranda: tiap angka diberi bentuk (garis tren, cincin) supaya terbaca sekilas. */
export function StatTiles({ stats, billing }: { stats: HomeStats; billing: { billed: number; collected: number } | null }) {
  const paidPct = billing && billing.billed ? Math.round((billing.collected / billing.billed) * 100) : null;
  const weekRates = stats.weekly.map((w) => w.rate);
  const sessionPct = stats.sessionsThisWeek ? Math.round((stats.sessionsRecordedThisWeek / stats.sessionsThisWeek) * 100) : 0;
  return (
    <section aria-label="Ringkasan" className="rise grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile
        href="/jadwal"
        tone="ember"
        className="col-span-2"
        label="Kehadiran 30 hari"
        value={stats.attendanceRate === null ? "-" : `${stats.attendanceRate}%`}
        note={stats.attendanceRate === null ? "Belum ada absensi" : "dari absensi yang tercatat"}
      >
        <span className="w-28 shrink-0 text-ink sm:w-40">
          <Sparkline values={weekRates} />
        </span>
      </Tile>
      <Tile
        href="/pemain"
        label="Pemain aktif"
        value={String(stats.activePlayers)}
        note={stats.newPlayersThisMonth ? `+${stats.newPlayersThisMonth} bulan ini` : "Belum ada yang baru bulan ini"}
      />
      {billing ? (
        <Tile
          href="/iuran"
          label="Iuran terkumpul"
          value={paidPct === null ? "-" : `${paidPct}%`}
          note={billing.billed ? `${rupiah(billing.collected)} dari ${rupiah(billing.billed)}` : "Belum ada tagihan"}
        >
          {paidPct !== null ? (
            <Ring value={paidPct} size={52} stroke={7} className="shrink-0 text-turf">
              <span className="sr-only">{paidPct}%</span>
            </Ring>
          ) : null}
        </Tile>
      ) : (
        <Tile
          href="/jadwal"
          label="Latihan minggu ini"
          value={String(stats.sessionsThisWeek)}
          note={`${stats.sessionsRecordedThisWeek} sudah diabsen`}
        >
          <Ring value={sessionPct} size={52} stroke={7} className="shrink-0 text-turf">
            <span className="sr-only">{sessionPct}%</span>
          </Ring>
        </Tile>
      )}
    </section>
  );
}

/** Tren kehadiran mingguan (satu seri) dan kehadiran per tim. */
export function AttendanceWidgets({ stats }: { stats: HomeStats }) {
  // Sorot minggu terakhir yang sudah ada absensinya (minggu berjalan bisa masih kosong).
  const latest = stats.weekly.findLastIndex((w) => w.rate !== null);
  if (latest < 0) return null;
  return (
    <section className="rise grid gap-3 lg:grid-cols-[1.4fr_1fr]" aria-label="Statistik kehadiran">
      <figure className="rounded-[2rem] bg-chalk p-6">
        <figcaption>
          <span className="block text-lg font-extrabold">Kehadiran per minggu</span>
          <span className="block text-sm text-ink-soft">Persentase hadir, 6 minggu terakhir</span>
        </figcaption>
        <AreaTrend
          className="mt-8 text-turf"
          caption="Kehadiran per minggu"
          max={100}
          ticks={[0, 50, 100]}
          format={(n) => `${n}%`}
          points={stats.weekly.map((w) => ({
            label: weekLabel(w.weekStart),
            value: w.rate,
            note: w.rate === null ? undefined : `${w.rate}% hadir`,
          }))}
        />
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
