import { Plus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { dayLabel } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import { requirePage } from "@/server/routing";
import { listTournaments } from "@/server/tournaments";

export const metadata: Metadata = { title: "Turnamen" };

const LABEL = { draft: "Pendaftaran", running: "Berjalan", done: "Selesai" } as const;
const CLS = { draft: "bg-[#f6e7bd] text-[#6b5314]", running: "bg-ember text-white", done: "bg-mist text-ink-soft" } as const;

export default async function TurnamenPage() {
  const ctx = await requirePage("tournaments.read");
  const list = await listTournaments(ctx);
  const manage = ctx.can("tournaments.manage");
  return (
    <>
      <PageHeader title="Turnamen" subtitle="Liga dan turnamen: peserta, undian meja tiap babak, skor, dan klasemen." action={manage ? <ButtonLink href="/turnamen/baru"><Plus aria-hidden className="size-5" /> Turnamen baru</ButtonLink> : undefined} />
      {list.length ? (
        <ul className="rise grid gap-3">
          {list.map((t) => (
            <li key={t.id}>
              <Link href={`/turnamen/${t.id}`} className="tile tile-press flex flex-wrap items-center gap-4 p-5">
                <Trophy aria-hidden className="size-6 text-sun" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>{t.name}</span>
                  <span className="block text-sm text-ink-soft">{dayLabel(t.eventDate)} · {t.players} peserta ({t.paid} lunas) · daftar {rupiah(t.entryFee)} · babak {t.roundsPlayed}/{t.rounds}</span>
                </span>
                <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${CLS[t.status]}`}>{LABEL[t.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Belum ada turnamen" action={manage ? <ButtonLink href="/turnamen/baru">Buat turnamen pertama</ButtonLink> : undefined}>
          Buat liga mingguan atau turnamen. Meja tiap babak diundi otomatis supaya peserta jarang bertemu lawan yang sama.
        </EmptyState>
      )}
    </>
  );
}
