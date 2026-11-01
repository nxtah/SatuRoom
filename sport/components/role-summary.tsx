import { ChevronRight, NotebookPen, ShoppingBag, UserCheck, Wallet } from "lucide-react";
import Link from "next/link";
import { Ring } from "@/components/charts";
import { rupiah } from "@/lib/money";
import type { RoleSummary } from "@/server/role-summary";

const MONTH = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const short = (n: number) => (Math.abs(n) >= 1_000_000 ? `${Math.round(n / 100_000) / 10} jt` : Math.abs(n) >= 1000 ? `${Math.round(n / 1000)} rb` : String(n));
const dayLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

function Card({ href, title, icon, children, className = "" }: { href: string; title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rise flex flex-col rounded-[2rem] bg-chalk p-5 sm:p-6 ${className}`}>
      <Link href={href} className="group mb-4 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-full bg-turf-soft text-pitch">{icon}</span>
        <h2 className="flex-1 text-lg font-extrabold">{title}</h2>
        <ChevronRight aria-hidden className="size-5 text-ink-soft transition group-hover:translate-x-0.5" />
      </Link>
      {children}
    </section>
  );
}

/** Grafik batang ganda pemasukan vs pengeluaran 6 bulan. */
function MoneyChart({ months }: { months: NonNullable<RoleSummary["money"]>["months"] }) {
  const hi = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  return (
    <figure>
      <div className="flex h-36 items-end gap-2 sm:gap-3" role="img" aria-label={months.map((m) => `${m.month}: masuk ${rupiah(m.income)}, keluar ${rupiah(m.expense)}`).join("; ")}>
        {months.map((m, i) => (
          <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-0.5 sm:gap-1">
              <span className="grow-col w-full max-w-5 origin-bottom rounded-t-md bg-turf" style={{ height: `${(m.income / hi) * 100}%`, animationDelay: `${i * 60}ms` }} title={`Masuk ${rupiah(m.income)}`} />
              <span className="grow-col w-full max-w-5 origin-bottom rounded-t-md bg-ember" style={{ height: `${(m.expense / hi) * 100}%`, animationDelay: `${i * 60 + 30}ms` }} title={`Keluar ${rupiah(m.expense)}`} />
            </div>
            <span className="mt-1 text-center text-xs font-bold text-ink-soft">{MONTH[Number(m.month.slice(5)) - 1]}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex flex-wrap gap-3 text-xs font-bold">
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-turf" /> Pemasukan</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-full bg-ember" /> Pengeluaran</span>
      </figcaption>
    </figure>
  );
}

export function RoleSummaryCards({ s }: { s: RoleSummary }) {
  if (!s.money && !s.staff && !s.store && !s.coach) return null;
  const now = s.money?.months.at(-1);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {s.coach ? (
        <Card href="/jadwal" title="Latihan saya 7 hari ke depan" icon={<NotebookPen aria-hidden className="size-5" />}>
          <div className="flex items-center gap-4">
            <Ring value={s.coach.week ? s.coach.planned / s.coach.week : 0} size={84}>
              <span className="text-lg font-extrabold">{s.coach.planned}/{s.coach.week}</span>
            </Ring>
            <p className="text-sm text-ink-soft">{s.coach.week ? `${s.coach.planned} dari ${s.coach.week} sesi sudah ada topik latihannya.` : "Belum ada sesi latihan minggu ini."}</p>
          </div>
          {s.coach.next.length ? (
            <ul className="mt-4 grid gap-2">
              {s.coach.next.map((n) => (
                <li key={n.id}>
                  <Link href={`/jadwal/${n.id}`} className="flex items-center gap-3 rounded-2xl bg-mist p-3 transition hover:bg-turf-soft">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{n.team} · {dayLabel(n.date)} {n.time}</span>
                      <span className={`block truncate text-sm ${n.topic ? "text-ink-soft" : "font-bold text-ember-deep"}`}>{n.topic ?? "Belum ada topik, ketuk untuk mengisi"}</span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ) : null}

      {s.money && now ? (
        <Card href="/keuangan" title="Keuangan 6 bulan" icon={<Wallet aria-hidden className="size-5" />}>
          <dl className="mb-4 grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-2xl bg-mist p-3"><dt className="text-ink-soft">Masuk bulan ini</dt><dd className="font-extrabold tabular-nums">{short(now.income)}</dd></div>
            <div className="rounded-2xl bg-mist p-3"><dt className="text-ink-soft">Keluar bulan ini</dt><dd className="font-extrabold tabular-nums">{short(now.expense)}</dd></div>
            <div className="rounded-2xl bg-mist p-3"><dt className="text-ink-soft">Kas + bank</dt><dd className="font-extrabold tabular-nums">{short(s.money.cash)}</dd></div>
          </dl>
          <MoneyChart months={s.money.months} />
        </Card>
      ) : null}

      {s.staff && s.staff.total ? (
        <Card href="/absensi-staf?tab=tim" title="Absensi staf hari ini" icon={<UserCheck aria-hidden className="size-5" />}>
          <div className="flex items-center gap-4">
            <Ring value={(s.staff.present + s.staff.late) / s.staff.total} size={84}>
              <span className="text-lg font-extrabold">{s.staff.present + s.staff.late}/{s.staff.total}</span>
            </Ring>
            <div className="grid flex-1 grid-cols-2 gap-2 text-sm">
              {[
                ["Tepat waktu", s.staff.present, "bg-turf"],
                ["Terlambat", s.staff.late, "bg-sun"],
                ["Belum masuk", s.staff.waiting, "bg-line"],
                ["Tidak hadir", s.staff.absent, "bg-flame"],
              ].map(([l, v, c]) => (
                <span key={l as string} className="flex items-center gap-1.5"><span className={`size-2.5 shrink-0 rounded-full ${c}`} /> {l} <b className="ml-auto tabular-nums">{v}</b></span>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {s.store ? (
        <Card href="/toko" title="Toko" icon={<ShoppingBag aria-hidden className="size-5" />}>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-2xl bg-mist p-3"><dt className="text-ink-soft">Jual bulan ini</dt><dd className="font-extrabold tabular-nums">{short(s.store.salesMonth)}</dd></div>
            <div className={`rounded-2xl p-3 ${s.store.pending ? "bg-sun/40" : "bg-mist"}`}><dt className="text-ink-soft">Menunggu bayar</dt><dd className="font-extrabold">{s.store.pending}</dd></div>
            <div className={`rounded-2xl p-3 ${s.store.lowStock ? "bg-flame/10" : "bg-mist"}`}><dt className="text-ink-soft">Stok menipis</dt><dd className="font-extrabold">{s.store.lowStock}</dd></div>
          </dl>
        </Card>
      ) : null}

    </div>
  );
}
