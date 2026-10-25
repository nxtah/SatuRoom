import { Pencil, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ageOf, formatDate } from "@/lib/age";
import { POSITIONS } from "@/lib/schemas";
import { requireAcademyPage } from "@/server/routing";
import { loadPlayer } from "../load";
import { StatusToggle } from "./status-toggle";

export const metadata: Metadata = { title: "Pemain" };

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  const p = await loadPlayer(ctx, id);
  const canManage = ctx.can("players.manage");
  const rows: [string, React.ReactNode][] = [
    ["Tanggal lahir", `${formatDate(p.birthDate)} (${ageOf(p.birthDate)} tahun)`],
    ["Posisi", POSITIONS.find((x) => x.id === p.position)?.label ?? "Belum diisi"],
    ["Nomor punggung", p.shirtNumber ?? "Belum diisi"],
  ];

  return (
    <div className="max-w-2xl">
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

      <section className="rise flex items-center gap-4 rounded-[2rem] bg-pitch p-6 text-white sm:p-8">
        <span className="grid size-18 shrink-0 place-items-center rounded-full bg-ember text-2xl font-extrabold text-ink">
          {p.shirtNumber ?? p.fullName[0]?.toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white/70">Tim</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {p.teams.length ? (
              p.teams.map((t) => (
                <Link key={t.id} href={`/tim/${t.id}`} className="rounded-full bg-white/12 px-3 py-1 font-bold hover:bg-white/20">
                  {t.name}
                </Link>
              ))
            ) : (
              <span className="font-bold">Tanpa tim</span>
            )}
          </div>
        </div>
      </section>

      <dl className="rise mt-4 grid gap-1 rounded-[2rem] bg-chalk p-3">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap justify-between gap-2 rounded-2xl p-3">
            <dt className="text-ink-soft">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      {p.guardian ? (
        <section className="rise mt-4 rounded-[2rem] bg-chalk p-6" aria-labelledby="wali">
          <h2 id="wali" className="font-extrabold">
            Orang tua/wali
          </h2>
          {p.guardian.name || p.guardian.phone ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-bold">{p.guardian.name ?? "Tanpa nama"}</p>
                <p className="text-ink-soft">{p.guardian.phone ?? "Nomor belum diisi"}</p>
              </div>
              {p.guardian.phone ? (
                <ButtonLink href={`tel:${p.guardian.phone.replace(/[^+0-9]/g, "")}`} variant="outline" size="sm">
                  <Phone aria-hidden className="size-4" /> Telepon
                </ButtonLink>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-ink-soft">Belum diisi.</p>
          )}
        </section>
      ) : null}

      {canManage ? <StatusToggle id={id} status={p.status} /> : null}
    </div>
  );
}
