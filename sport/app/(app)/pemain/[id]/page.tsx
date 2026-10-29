import { Pencil, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_STYLE } from "@/components/attendance-badge";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ageOf, formatDate } from "@/lib/age";
import { dayLabel } from "@/lib/dates";
import { ATTENDANCE } from "@/lib/schemas";
import { positionLabel } from "@/lib/sports";
import { playerAttendance } from "@/server/attendance";
import { requireAcademyPage } from "@/server/routing";
import { loadPlayer } from "../load";
import { SessionCard } from "@/components/session-card";
import { monthLabel, rupiah } from "@/lib/money";
import { inAcademy } from "@/server/context";
import { playerInvoices } from "@/server/fees";
import { listEvaluations } from "@/server/evaluations";
import { playerAccount } from "@/server/player-account";
import { academyToday, addDays, listSessions } from "@/server/schedule";
import { EvaluationPanel } from "./evaluation-panel";
import { PlayerAccount } from "./player-account";
import { StatusToggle } from "./status-toggle";

const INVOICE_STATUS = {
  unpaid: { label: "Belum bayar", className: "bg-[#fdecec] text-[#b42318]" },
  paid: { label: "Lunas", className: "bg-turf/15 text-turf" },
  waived: { label: "Dibebaskan", className: "bg-mist text-ink-soft" },
} as const;

export const metadata: Metadata = { title: "Pemain" };

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  const p = await loadPlayer(ctx, id);
  const canManage = ctx.can("players.manage");
  const today = await inAcademy(ctx, academyToday);
  const teamIds = new Set(p.teams.map((t) => t.id));
  const [history, sessions, invoices, account, evaluations] = await Promise.all([
    playerAttendance(ctx, id),
    p.status === "active" && teamIds.size
      ? listSessions(ctx, { from: today, to: addDays(today, 14) })
      : [],
    ctx.can("billing.read") ? playerInvoices(ctx, id) : null,
    canManage && p.status === "active" ? playerAccount(ctx, id) : null,
    ctx.can("evaluations.write") ? listEvaluations(ctx, id) : null,
  ]);
  const upcoming = sessions
    .filter((s) => teamIds.has(s.teamId) && s.status === "scheduled")
    .slice(0, 3);
  const rows: [string, React.ReactNode][] = [
    [
      "Tanggal lahir",
      `${formatDate(p.birthDate)} (${ageOf(p.birthDate)} tahun)`,
    ],
    [
      "Posisi",
      positionLabel(ctx.sport, p.position) ?? "Belum diisi",
    ],
    ["Nomor punggung", p.shirtNumber ?? "Belum diisi"],
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title={p.fullName}
        subtitle={p.status === "inactive" ? "Nonaktif" : undefined}
        back={{ href: "/pemain", label: "Pemain" }}
        action={
          canManage && p.status === "active" ? (
            <ButtonLink href={`/pemain/${id}/ubah`} variant="outline">
              <Pencil aria-hidden className="size-4" /> Ubah
            </ButtonLink>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="grid grid-cols-1 gap-4">
          <section className="rise flex items-center gap-4 rounded-[2rem] bg-pitch p-6 text-white sm:p-8">
            <span className="grid size-18 shrink-0 place-items-center rounded-full bg-ember text-2xl font-extrabold text-ink">
              {p.shirtNumber ?? p.fullName[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white/70">Tim</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {p.teams.length ? (
                  p.teams.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tim/${t.id}`}
                      className="rounded-full bg-white/12 px-3 py-1 font-bold hover:bg-white/20"
                    >
                      {t.name}
                    </Link>
                  ))
                ) : (
                  <span className="font-bold">Tanpa tim</span>
                )}
              </div>
            </div>
          </section>

          <dl className="rise grid gap-1 rounded-[2rem] bg-chalk p-3">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex flex-wrap justify-between gap-2 rounded-2xl p-3"
              >
                <dt className="text-ink-soft">{k}</dt>
                <dd className="font-bold">{v}</dd>
              </div>
            ))}
          </dl>
          {p.guardian ? (
            <section
              className="rise rounded-[2rem] bg-chalk p-6"
              aria-labelledby="wali"
            >
              <h2 id="wali" className="font-extrabold">
                Orang tua/wali
              </h2>
              {p.guardian.name || p.guardian.phone ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {p.guardian.name ?? "Tanpa nama"}
                    </p>
                    <p className="text-ink-soft">
                      {p.guardian.phone ?? "Nomor belum diisi"}
                    </p>
                  </div>
                  {p.guardian.phone ? (
                    <ButtonLink
                      href={`tel:${p.guardian.phone.replace(/[^+0-9]/g, "")}`}
                      variant="outline"
                      size="sm"
                    >
                      <Phone aria-hidden className="size-4" /> Telepon
                    </ButtonLink>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-ink-soft">Belum diisi.</p>
              )}
            </section>
          ) : null}

          {account ? <PlayerAccount playerId={id} info={account} /> : null}
          {evaluations ? <EvaluationPanel playerId={id} firstName={p.fullName.split(" ")[0]!} items={evaluations} /> : null}
        </div>
        <div className="grid grid-cols-1 gap-4">
          <section
            className="rise rounded-[2rem] bg-chalk p-6"
            aria-labelledby="kehadiran"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="kehadiran" className="font-extrabold">
                Kehadiran
              </h2>
              {history.rate !== null ? (
                <p className="text-sm text-ink-soft">
                  <span className="text-2xl font-extrabold text-ink">
                    {history.rate}%
                  </span>{" "}
                  hadir, {history.recorded} sesi dalam 60 hari
                </p>
              ) : null}
            </div>
            {history.recent.length ? (
              <ol className="mt-4 grid gap-1">
                {history.recent.map((h) => {
                  const label = ATTENDANCE.find(
                    (a) => a.id === h.status,
                  )!.label;
                  return (
                    <li key={h.sessionId}>
                      <Link
                        href={`/jadwal/${h.sessionId}`}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-mist"
                      >
                        <span
                          aria-hidden
                          className={`size-3 shrink-0 rounded-full ${STATUS_STYLE[h.status].dot}`}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {dayLabel(h.date)}{" "}
                          <span className="text-ink-soft">{h.teamName}</span>
                        </span>
                        <span className="shrink-0 font-bold">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-2 text-ink-soft">Belum ada absensi tercatat.</p>
            )}
          </section>

          {p.status === "active" && teamIds.size ? (
            <section
              className="rise rounded-[2rem] bg-chalk p-6"
              aria-labelledby="jadwal"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="jadwal" className="font-extrabold">
                  Jadwal berikutnya
                </h2>
                <Link
                  href={`/jadwal?tim=${p.teams[0]!.id}`}
                  className="text-sm font-bold text-ink-soft hover:text-ink"
                >
                  Lihat jadwal tim
                </Link>
              </div>
              {upcoming.length ? (
                <div className="mt-3 grid gap-2">
                  {upcoming.map((s) => (
                    <SessionCard key={s.id} s={s} today={today} withDate />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-ink-soft">
                  Belum ada latihan dalam dua minggu ke depan.
                </p>
              )}
            </section>
          ) : null}

          {invoices ? (
            <section
              className="rise rounded-[2rem] bg-chalk p-6"
              aria-labelledby="iuran"
            >
              <h2 id="iuran" className="font-extrabold">
                Iuran
              </h2>
              {invoices.length ? (
                <ul className="mt-3 grid gap-1">
                  {invoices.map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`/iuran?bulan=${i.month}`}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-mist"
                      >
                        <span className="flex-1">
                          <span className="block font-bold">
                            {monthLabel(i.month)}
                          </span>
                          <span className="block text-sm text-ink-soft">
                            {rupiah(i.amount)}
                          </span>
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${INVOICE_STATUS[i.status].className}`}
                        >
                          {INVOICE_STATUS[i.status].label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-ink-soft">
                  Belum ada tagihan untuk pemain ini.
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>

      {canManage ? <StatusToggle id={id} status={p.status} /> : null}
    </div>
  );
}
