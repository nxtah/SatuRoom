import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { STATUS_STYLE } from "@/components/attendance-badge";
import { Ruru } from "@/components/ruru";
import { ageOf } from "@/lib/age";
import { dayLabel } from "@/lib/dates";
import { monthLabel, rupiah } from "@/lib/money";
import { ATTENDANCE, POSITIONS } from "@/lib/schemas";
import { currentSession } from "@/server/context";
import { playerHome, type PlayerHome } from "@/server/player-account";
import { NoticeActions } from "./notice-actions";
import { AttendanceQr } from "./attendance-qr";

export const metadata: Metadata = { title: "Akun pemain" };

const INVOICE_STATUS = {
  unpaid: { label: "Belum bayar", className: "bg-[#fdecec] text-[#b42318]" },
  paid: { label: "Lunas", className: "bg-turf/15 text-turf" },
  waived: { label: "Dibebaskan", className: "bg-mist text-ink-soft" },
} as const;

export default async function SayaPage() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const me = await playerHome(session);
  if (!me) redirect("/undangan");
  const next = me.upcoming.find((s) => !s.cancelled);

  return (
    <>
      <Hero me={me} />

      <section
        aria-label="Ringkasan"
        className="rise mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <Tile
          label="Latihan berikutnya"
          value={next ? dayLabel(next.date) : "-"}
          note={
            next ? `${next.startTime}, ${next.teamName}` : "Belum ada jadwal"
          }
        />
        <Tile
          label="Kehadiran"
          value={me.attendance.rate === null ? "-" : `${me.attendance.rate}%`}
          note="60 hari terakhir"
          accent
        />
        <Tile
          label="Hadir"
          value={String(me.attendance.counts.present)}
          note={`dari ${me.attendance.recent.length ? Object.values(me.attendance.counts).reduce((a, b) => a + b, 0) : 0} latihan`}
        />
        <Tile
          label="Iuran"
          value={me.outstanding ? rupiah(me.outstanding) : "Lunas"}
          note={
            me.outstanding
              ? "belum terbayar"
              : me.invoices.length
                ? "tidak ada tunggakan"
                : "belum ada tagihan"
          }
        />
      </section>

      <nav aria-label="Jelajahi akun pemain" className="rise mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["/saya/jadwal", "Lihat jadwal", "Konfirmasi izin sebelum latihan"],
          ["/saya/kehadiran", "Kehadiran", "Lihat catatan latihan"],
          ["/saya/iuran", "Iuran", "Cek status tagihan"],
          ["/saya/profil", "Profil", "Data dari akademi"],
        ].map(([href, label, note]) => (
          <Link key={href} href={href} className="rounded-[1.5rem] border border-line bg-chalk p-4 transition hover:-translate-y-0.5 hover:border-turf hover:shadow-lg">
            <span className="block font-extrabold">{label}</span>
            <span className="mt-1 block text-sm text-ink-soft">{note}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <Upcoming me={me} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          <AttendanceQr />
          <Attendance me={me} />
          <Fees me={me} />
        </div>
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-3 rounded-[1.75rem] p-5 ${accent ? "bg-sun" : "bg-chalk"}`}
    >
      <span
        className={`text-sm font-bold ${accent ? "text-ink/70" : "text-ink-soft"}`}
      >
        {label}
      </span>
      <span>
        <span className="block text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">
          {value}
        </span>
        <span
          className={`mt-1 block text-sm ${accent ? "text-ink/70" : "text-ink-soft"}`}
        >
          {note}
        </span>
      </span>
    </div>
  );
}

export function Hero({ me }: { me: PlayerHome }) {
  const position = POSITIONS.find((p) => p.id === me.position)?.label;
  return (
    <section className="rise relative overflow-hidden rounded-[2rem] bg-pitch p-6 text-white sm:p-8">
      <div
        aria-hidden
        className="absolute -top-16 -right-16 size-64 rounded-full border-[14px] border-white/5"
      />
      <div className="relative flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/70">
            Halo, {me.fullName.split(" ")[0]}
          </p>
          <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            {me.fullName}
          </h1>
          <p className="mt-1 text-white/70">{me.academyName}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            {me.teamNames ? (
              <span className="rounded-full bg-white/12 px-3 py-1">
                {me.teamNames}
              </span>
            ) : null}
            <span className="rounded-full bg-white/12 px-3 py-1">
              {ageOf(me.birthDate)} tahun
            </span>
            {position ? (
              <span className="rounded-full bg-white/12 px-3 py-1">
                {position}
              </span>
            ) : null}
            {me.shirtNumber ? (
              <span className="rounded-full bg-ember px-3 py-1 text-ink">
                No. {me.shirtNumber}
              </span>
            ) : null}
          </div>
        </div>
        <div className="w-24 shrink-0 sm:w-36">
          <Ruru pose="wave" costume="academy" />
        </div>
      </div>
    </section>
  );
}

export function Upcoming({ me }: { me: PlayerHome }) {
  return (
    <section
      className="rise rounded-[2rem] bg-chalk p-6"
      aria-labelledby="jadwal"
    >
      <h2 id="jadwal" className="text-lg font-extrabold">
        Latihan berikutnya
      </h2>
      <p className="text-sm text-ink-soft">
        Tidak bisa datang? Kirim izin atau sakit sebelum latihan mulai.
      </p>
      {me.upcoming.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {me.upcoming.map((s) => (
            <li
              key={s.sessionId}
              className={`rounded-[1.5rem] border p-4 ${s.cancelled ? "border-dashed border-line" : "border-line bg-white/60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className={s.cancelled ? "text-ink-soft" : ""}>
                  <p
                    className={`font-extrabold ${s.cancelled ? "line-through" : ""}`}
                  >
                    {dayLabel(s.date)}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {s.startTime}–{s.endTime}, {s.teamName}
                  </p>
                </div>
                {s.cancelled ? (
                  <span className="rounded-full bg-[#fdecec] px-3 py-1 text-xs font-bold text-[#b42318]">
                    Dibatalkan
                  </span>
                ) : s.kind === "match" ? (
                  <span className="rounded-full bg-ember px-3 py-1 text-xs font-bold text-ink">
                    Pertandingan
                  </span>
                ) : null}
              </div>
              {s.cancelled && s.cancelReason ? (
                <p className="mt-2 text-sm text-ink-soft">{s.cancelReason}</p>
              ) : null}
              {s.attendance ? (
                <p className="mt-2 text-sm font-bold">
                  Tercatat:{" "}
                  {ATTENDANCE.find((a) => a.id === s.attendance)!.label}
                </p>
              ) : s.canNotify ? (
                <NoticeActions sessionId={s.sessionId} notice={s.notice} />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-[1.5rem] border border-dashed border-line p-5 text-ink-soft">
          Belum ada jadwal latihan dalam dua minggu ke depan.
        </p>
      )}
    </section>
  );
}

export function Attendance({ me }: { me: PlayerHome }) {
  const { counts, recent } = me.attendance;
  return (
    <section
      className="rise rounded-[2rem] bg-chalk p-6"
      aria-labelledby="hadir"
    >
      <h2 id="hadir" className="text-lg font-extrabold">
        Kehadiran
      </h2>
      <p className="text-sm text-ink-soft">60 hari terakhir</p>
      {recent.length ? (
        <>
          <ul className="mt-4 grid grid-cols-4 gap-1.5 text-center">
            {ATTENDANCE.map((a) => (
              <li key={a.id} className="rounded-2xl bg-mist px-1 py-2">
                <span className="block text-lg font-extrabold">
                  {counts[a.id]}
                </span>
                <span className="flex items-center justify-center gap-1 text-xs font-bold text-ink-soft">
                  <span
                    aria-hidden
                    className={`size-2 rounded-full ${STATUS_STYLE[a.id].dot}`}
                  />
                  {a.label}
                </span>
              </li>
            ))}
          </ul>
          <ol className="mt-4 grid gap-1">
            {recent.slice(0, 5).map((r) => (
              <li
                key={r.date + r.status}
                className="flex items-center gap-3 px-1 py-1 text-sm"
              >
                <span
                  aria-hidden
                  className={`size-2.5 shrink-0 rounded-full ${STATUS_STYLE[r.status].dot}`}
                />
                <span className="flex-1">{dayLabel(r.date)}</span>
                <span className="font-bold">
                  {ATTENDANCE.find((a) => a.id === r.status)!.label}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="mt-4 text-ink-soft">Belum ada absensi tercatat.</p>
      )}
    </section>
  );
}

export function Fees({ me }: { me: PlayerHome }) {
  return (
    <section
      className="rise rounded-[2rem] bg-chalk p-6"
      aria-labelledby="iuran"
    >
      <h2 id="iuran" className="text-lg font-extrabold">
        Iuran
      </h2>
      <p className="text-sm text-ink-soft">
        Pembayaran tetap lewat tunai atau transfer ke akademi.
      </p>
      {me.invoices.length ? (
        <ul className="mt-3 grid gap-1">
          {me.invoices.map((i) => (
            <li
              key={i.id}
              className="flex items-center gap-3 rounded-2xl px-1 py-2"
            >
              <span className="flex-1">
                <span className="block font-bold">{monthLabel(i.period)}</span>
                <span className="block text-sm text-ink-soft">
                  {rupiah(i.amount)}
                </span>
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${INVOICE_STATUS[i.status].className}`}
              >
                {INVOICE_STATUS[i.status].label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-ink-soft">Belum ada tagihan.</p>
      )}
    </section>
  );
}
