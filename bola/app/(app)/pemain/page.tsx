import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { ageOf } from "@/lib/age";
import { POSITIONS } from "@/lib/schemas";
import { listPlayers } from "@/server/players";
import { requireAcademyPage } from "@/server/routing";
import { listTeams } from "@/server/teams";

export const metadata: Metadata = { title: "Pemain" };

type Search = { q?: string; tim?: string; status?: string };

export default async function PemainPage({ searchParams }: { searchParams: Promise<Search> }) {
  const ctx = await requireAcademyPage();
  const sp = await searchParams;
  const status = sp.status === "nonaktif" ? "inactive" : "active";
  const teamId = sp.tim && /^[0-9a-f-]{36}$/i.test(sp.tim) ? sp.tim : undefined;
  const q = sp.q?.slice(0, 100);
  const [players, teams] = await Promise.all([listPlayers(ctx, { q, teamId, status }), listTeams(ctx)]);
  const canManage = ctx.can("players.manage") && teams.length > 0;
  const filtered = Boolean(q || teamId || status === "inactive");
  const add = canManage ? (
    <ButtonLink href={teamId ? `/pemain/baru?tim=${teamId}` : "/pemain/baru"}>
      <Plus aria-hidden className="size-5" /> Tambah pemain
    </ButtonLink>
  ) : null;

  const href = (next: Partial<Search>) => {
    const p = new URLSearchParams();
    const merged = { q, tim: teamId, status: status === "inactive" ? "nonaktif" : undefined, ...next };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/pemain?${s}` : "/pemain";
  };
  const chip = (on: boolean) =>
    `inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-bold transition ${
      on ? "bg-pitch text-white" : "bg-chalk text-ink-soft hover:text-ink"
    }`;

  if (!filtered && players.length === 0) {
    return (
      <>
        <PageHeader title="Pemain" />
        <EmptyState
          title="Belum ada pemain"
          action={
            add ?? (ctx.can("teams.manage") ? <ButtonLink href="/tim/baru">Buat tim dulu</ButtonLink> : null)
          }
        >
          {teams.length === 0 && ctx.can("teams.manage")
            ? "Pemain dikelompokkan per tim. Buat tim pertama, lalu tambahkan pemainnya."
            : canManage
              ? "Cukup nama, tanggal lahir, dan tim. Posisi dan nomor punggung bisa diisi nanti."
              : "Pemain di tim yang Anda pegang akan muncul di sini."}
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Pemain" subtitle={`${players.length} pemain ${status === "inactive" ? "nonaktif" : "aktif"}`} action={add} />

      <div className="rise mb-4 grid gap-3">
        <form action="/pemain" className="relative" role="search">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Cari nama pemain"
            aria-label="Cari nama pemain"
            className="h-13 w-full rounded-full border-2 border-line bg-chalk pr-4 pl-12 outline-none focus:border-pitch"
          />
          {teamId ? <input type="hidden" name="tim" value={teamId} /> : null}
          {status === "inactive" ? <input type="hidden" name="status" value="nonaktif" /> : null}
        </form>
        <nav aria-label="Saring pemain" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <Link href={href({ tim: undefined })} className={chip(!teamId)} aria-current={!teamId ? "true" : undefined}>
            Semua tim
          </Link>
          {teams.map((t) => (
            <Link key={t.id} href={href({ tim: t.id })} className={chip(teamId === t.id)} aria-current={teamId === t.id ? "true" : undefined}>
              {t.name}
            </Link>
          ))}
          <Link
            href={href({ status: status === "inactive" ? undefined : "nonaktif" })}
            className={`${chip(status === "inactive")} ml-auto`}
            aria-current={status === "inactive" ? "true" : undefined}
          >
            Nonaktif
          </Link>
        </nav>
      </div>

      {players.length === 0 ? (
        <p className="rise rounded-[2rem] bg-chalk p-8 text-center text-ink-soft">Tidak ada pemain yang cocok.</p>
      ) : (
        <ul className="rise grid gap-1 rounded-[2rem] bg-chalk p-2 sm:p-3">
          {players.map((p) => (
            <li key={p.id}>
              <Link href={`/pemain/${p.id}`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-mist">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-pitch font-extrabold text-white">
                  {p.shirtNumber ?? p.fullName[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{p.fullName}</span>
                  <span className="block truncate text-sm text-ink-soft">
                    {[p.teams.map((t) => t.name).join(", ") || "Tanpa tim", POSITIONS.find((x) => x.id === p.position)?.label]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-mist px-3 py-1 text-sm font-bold text-ink-soft">{ageOf(p.birthDate)} th</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
