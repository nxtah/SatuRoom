import { Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ageOf, ageRangeLabel } from "@/lib/age";
import { AppError } from "@/server/errors";
import { listPlayers } from "@/server/players";
import { requireAcademyPage } from "@/server/routing";
import { getTeam } from "@/server/teams";

export const metadata: Metadata = { title: "Tim" };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  const team = await getTeam(ctx, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  const players = await listPlayers(ctx, { teamId: id });
  const range = ageRangeLabel(team.ageMin, team.ageMax);

  return (
    <>
      <PageHeader
        title={team.name}
        subtitle={[range, team.coaches.length ? `Pelatih: ${team.coaches.join(", ")}` : "Belum ada pelatih"]
          .filter(Boolean)
          .join(". ")}
        back={{ href: "/tim", label: "Tim" }}
        action={
          ctx.can("teams.manage") ? (
            <ButtonLink href={`/tim/${id}/ubah`} variant="outline">
              <Pencil aria-hidden className="size-4" /> Ubah
            </ButtonLink>
          ) : null
        }
      />
      <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="pemain-tim">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="pemain-tim" className="text-xl font-extrabold">
            {players.length} pemain
          </h2>
          {ctx.can("players.manage") ? (
            <ButtonLink href={`/pemain/baru?tim=${id}`} size="sm">
              <Plus aria-hidden className="size-4" /> Tambah pemain
            </ButtonLink>
          ) : null}
        </div>
        {players.length === 0 ? (
          <p className="mt-4 text-ink-soft">Belum ada pemain di tim ini.</p>
        ) : (
          <ul className="mt-4 grid gap-1">
            {players.map((p) => (
              <li key={p.id}>
                <Link href={`/pemain/${p.id}`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-mist">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pitch text-sm font-extrabold text-white">
                    {p.shirtNumber ?? p.fullName[0]?.toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold">{p.fullName}</span>
                  <span className="shrink-0 text-sm text-ink-soft">{ageOf(p.birthDate)} th</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
