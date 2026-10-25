import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { STATUS_STYLE } from "@/components/attendance-badge";
import { Brand } from "@/components/brand";
import { Ruru } from "@/components/ruru";
import { ageOf } from "@/lib/age";
import { dayLabel } from "@/lib/dates";
import { monthLabel, rupiah } from "@/lib/money";
import { ATTENDANCE, POSITIONS } from "@/lib/schemas";
import { currentSession } from "@/server/context";
import { guardianHome, type ChildView } from "@/server/guardian";
import { LogoutButton } from "./logout-button";
import { NoticeActions } from "./notice-actions";

export const metadata: Metadata = { title: "Portal orang tua" };

const INVOICE_STATUS = {
  unpaid: { label: "Belum bayar", className: "bg-[#fdecec] text-[#b42318]" },
  paid: { label: "Lunas", className: "bg-turf/15 text-turf" },
  waived: { label: "Dibebaskan", className: "bg-mist text-ink-soft" },
} as const;

export default async function WaliPage({ searchParams }: { searchParams: Promise<{ anak?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const children = await guardianHome(session);
  if (children.length === 0) redirect("/undangan");
  const { anak } = await searchParams;
  const child = children.find((c) => c.playerId === anak) ?? children[0]!;
  const firstName = session.name.split(" ")[0];

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 pb-16 sm:px-8">
      <header className="flex h-18 items-center justify-between gap-3">
        <Brand href="/wali" />
        <LogoutButton />
      </header>

      <p className="rise mt-2 text-ink-soft">Halo, {firstName}</p>

      {children.length > 1 ? (
        <nav aria-label="Pilih anak" className="rise mt-3 flex flex-wrap gap-2">
          {children.map((c) => {
            const on = c.playerId === child.playerId;
            return (
              <Link
                key={c.playerId}
                href={`/wali?anak=${c.playerId}`}
                aria-current={on ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                  on ? "bg-pitch text-white" : "bg-chalk text-ink hover:bg-white"
                }`}
              >
                {c.fullName.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <ChildHero child={child} />
      <Upcoming child={child} />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Attendance child={child} />
        <Fees child={child} />
      </div>
    </div>
  );
}

function ChildHero({ child }: { child: ChildView }) {
  const position = POSITIONS.find((p) => p.id === child.position)?.label;
  return (
    <section className="rise relative mt-4 overflow-hidden rounded-[2rem] bg-pitch p-6 text-white sm:p-8">
      <div aria-hidden className="absolute -top-16 -right-16 size-64 rounded-full border-[14px] border-white/5" />
      <div className="relative flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/70">{child.academyName}</p>
          <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">{child.fullName}</h1>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-bold">
            {child.teamNames ? <span className="rounded-full bg-white/12 px-3 py-1">{child.teamNames}</span> : null}
            <span className="rounded-full bg-white/12 px-3 py-1">{ageOf(child.birthDate)} tahun</span>
            {position ? <span className="rounded-full bg-white/12 px-3 py-1">{position}</span> : null}
            {child.shirtNumber ? <span className="rounded-full bg-ember px-3 py-1 text-ink">No. {child.shirtNumber}</span> : null}
          </div>
        </div>
        <div className="w-24 shrink-0 sm:w-28">
          <Ruru pose="wave" costume="academy" />
        </div>
      </div>
    </section>
  );
}

function Upcoming({ child }: { child: ChildView }) {
  return (
    <section className="rise mt-4 rounded-[2rem] bg-chalk p-6" aria-labelledby="jadwal">
      <h2 id="jadwal" className="text-lg font-extrabold">
        Latihan berikutnya
      </h2>
      <p className="text-sm text-ink-soft">Tidak bisa datang? Kirim izin atau sakit sebelum latihan mulai.</p>
      {child.upcoming.length ? (
        <ul className="mt-4 grid gap-2">
          {child.upcoming.map((s) => (
            <li
              key={s.sessionId}
              className={`rounded-[1.5rem] border p-4 ${s.cancelled ? "border-dashed border-line" : "border-line bg-white/60"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className={s.cancelled ? "text-ink-soft" : ""}>
                  <p className={`font-extrabold ${s.cancelled ? "line-through" : ""}`}>{dayLabel(s.date)}</p>
                  <p className="text-sm text-ink-soft">
                    {s.startTime}–{s.endTime}, {s.teamName}
                  </p>
                </div>
                {s.cancelled ? (
                  <span className="rounded-full bg-[#fdecec] px-3 py-1 text-xs font-bold text-[#b42318]">Dibatalkan</span>
                ) : s.kind === "match" ? (
                  <span className="rounded-full bg-ember px-3 py-1 text-xs font-bold text-ink">Pertandingan</span>
                ) : null}
              </div>
              {s.cancelled && s.cancelReason ? <p className="mt-2 text-sm text-ink-soft">{s.cancelReason}</p> : null}
              {s.attendance ? (
                <p className="mt-2 text-sm font-bold">
                  Tercatat: {ATTENDANCE.find((a) => a.id === s.attendance)!.label}
                </p>
              ) : s.canNotify ? (
                <NoticeActions playerId={child.playerId} sessionId={s.sessionId} notice={s.notice} />
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

function Attendance({ child }: { child: ChildView }) {
  const { rate, counts, recent } = child.attendance;
  return (
    <section className="rise rounded-[2rem] bg-chalk p-6" aria-labelledby="hadir">
      <h2 id="hadir" className="text-lg font-extrabold">
        Kehadiran
      </h2>
      <p className="text-sm text-ink-soft">60 hari terakhir</p>
      {recent.length ? (
        <>
          <p className="mt-4 text-4xl font-extrabold tracking-tight">{rate}%</p>
          <p className="text-sm text-ink-soft">hadir dari {Object.values(counts).reduce((a, b) => a + b, 0)} latihan</p>
          <ul className="mt-4 grid grid-cols-4 gap-1.5 text-center">
            {ATTENDANCE.map((a) => (
              <li key={a.id} className="rounded-2xl bg-mist px-1 py-2">
                <span className="block text-lg font-extrabold">{counts[a.id]}</span>
                <span className="flex items-center justify-center gap-1 text-xs font-bold text-ink-soft">
                  <span aria-hidden className={`size-2 rounded-full ${STATUS_STYLE[a.id].dot}`} />
                  {a.label}
                </span>
              </li>
            ))}
          </ul>
          <ol className="mt-4 grid gap-1">
            {recent.slice(0, 5).map((r) => (
              <li key={r.date + r.status} className="flex items-center gap-3 px-1 py-1 text-sm">
                <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${STATUS_STYLE[r.status].dot}`} />
                <span className="flex-1">{dayLabel(r.date)}</span>
                <span className="font-bold">{ATTENDANCE.find((a) => a.id === r.status)!.label}</span>
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

function Fees({ child }: { child: ChildView }) {
  return (
    <section className="rise rounded-[2rem] bg-chalk p-6" aria-labelledby="iuran">
      <h2 id="iuran" className="text-lg font-extrabold">
        Iuran
      </h2>
      <p className="text-sm text-ink-soft">Pembayaran tetap lewat tunai atau transfer ke akademi.</p>
      {child.invoices.length ? (
        <>
          <div className={`mt-4 rounded-2xl p-4 ${child.outstanding ? "bg-[#fff1e6]" : "bg-turf/10"}`}>
            <p className="text-sm font-bold text-ink-soft">{child.outstanding ? "Belum terbayar" : "Semua lunas"}</p>
            <p className="text-2xl font-extrabold tracking-tight">{rupiah(child.outstanding)}</p>
          </div>
          <ul className="mt-3 grid gap-1">
            {child.invoices.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded-2xl px-1 py-2">
                <span className="flex-1">
                  <span className="block font-bold">{monthLabel(i.period)}</span>
                  <span className="block text-sm text-ink-soft">{rupiah(i.amount)}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${INVOICE_STATUS[i.status].className}`}>
                  {INVOICE_STATUS[i.status].label}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-ink-soft">Belum ada tagihan.</p>
      )}
    </section>
  );
}
