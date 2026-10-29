import { Crown, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { TIER_LABEL } from "@/lib/billing";
import { rupiah } from "@/lib/money";
import { listMembers } from "@/server/members";
import { requirePage } from "@/server/routing";

export const metadata: Metadata = { title: "Member" };

const TIER_STYLE = { regular: "bg-mist text-ink-soft", silver: "bg-[#e3e7ea] text-[#3d4a54]", gold: "bg-[#f6e7bd] text-[#6b5314]" } as const;

export default async function MemberPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requirePage("members.read");
  const { q = "" } = await searchParams;
  const members = await listMembers(ctx, q);
  const manage = ctx.can("members.manage");
  return (
    <>
      <PageHeader title="Member" subtitle="Langganan tetap: diskon sewa meja dan saldo untuk bayar." action={manage ? <ButtonLink href="/member/baru"><Plus aria-hidden className="size-5" /> Member baru</ButtonLink> : undefined} />
      <form className="rise relative mb-4" role="search">
        <Search aria-hidden className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
        <input name="q" defaultValue={q} aria-label="Cari member" placeholder="Cari nama atau nomor HP" className="h-12 w-full rounded-xl border-2 border-line bg-chalk pr-4 pl-10 outline-none focus:border-pitch" />
      </form>
      {members.length ? (
        <ul className="rise grid gap-2">
          {members.map((m) => (
            <li key={m.id} className="min-w-0">
              <Link href={`/member/${m.id}`} className="tile tile-press flex items-center gap-4 p-4">
                <span className={`grid size-12 shrink-0 place-items-center rounded-lg font-extrabold ${TIER_STYLE[m.tier]}`}>{m.tier === "gold" ? <Crown aria-hidden className="size-5" /> : m.fullName[0]?.toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{m.fullName}</span>
                  <span className="block truncate text-sm text-ink-soft">{TIER_LABEL[m.tier]} · {m.visits} kunjungan{m.phone ? ` · ${m.phone}` : ""}</span>
                </span>
                <span className="tnum shrink-0 text-right"><span className="block text-xs font-semibold text-ink-soft">Saldo</span><span className="font-extrabold">{rupiah(m.balance)}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={q ? "Tidak ketemu" : "Belum ada member"} action={manage && !q ? <ButtonLink href="/member/baru">Tambah member pertama</ButtonLink> : undefined}>
          {q ? "Coba nama atau nomor HP lain." : "Member mendapat diskon otomatis dan bisa menyimpan saldo untuk bayar meja."}
        </EmptyState>
      )}
    </>
  );
}
