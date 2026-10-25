import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ageRangeLabel } from "@/lib/age";
import { requireAcademyPage } from "@/server/routing";
import { listTeams } from "@/server/teams";

export const metadata: Metadata = { title: "Tim" };

export default async function TimPage() {
  const ctx = await requireAcademyPage();
  const teams = await listTeams(ctx);
  const canManage = ctx.can("teams.manage");
  const add = canManage ? (
    <ButtonLink href="/tim/baru">
      <Plus aria-hidden className="size-5" /> Buat tim
    </ButtonLink>
  ) : null;

  if (teams.length === 0) {
    return (
      <>
        <PageHeader title="Tim" />
        <EmptyState title={canManage ? "Belum ada tim" : "Anda belum memegang tim"} action={add}>
          {canManage
            ? "Buat tim per kelompok umur, misalnya KU 10-13. Pemain dan jadwal latihan nanti dikelompokkan per tim."
            : "Minta admin akademi menugaskan Anda ke tim. Setelah itu tim Anda muncul di sini."}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Tim" subtitle={`${teams.length} tim aktif`} action={add} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {teams.map((t, i) => {
          const range = ageRangeLabel(t.ageMin, t.ageMax);
          return (
            <li key={t.id} className="rise min-w-0" style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}>
              <Link
                href={`/tim/${t.id}`}
                className="group flex items-center gap-4 rounded-[1.75rem] bg-chalk p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgb(13_59_46/0.5)]"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-turf-soft text-lg font-extrabold text-pitch">
                  {t.playerCount}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-extrabold">{t.name}</span>
                  <span className="line-clamp-2 block text-sm text-ink-soft">
                    {[range, `${t.playerCount} pemain`, t.coaches.length ? `Pelatih: ${t.coaches.join(", ")}` : "Belum ada pelatih"]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-soft transition group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
