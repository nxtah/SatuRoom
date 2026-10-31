import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { AUDIT_GROUPS, listAudit } from "@/server/audit";
import { getAcademy } from "@/server/academy";
import { requireAcademyPage } from "@/server/routing";

export const metadata: Metadata = { title: "Jejak aktivitas" };

export default async function AktivitasPage({ searchParams }: { searchParams: Promise<{ jenis?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.can("audit.read")) redirect("/");
  const { jenis = "" } = await searchParams;
  const [rows, academy] = await Promise.all([listAudit(ctx, jenis), getAcademy(ctx)]);
  const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: academy.timezone });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Jejak aktivitas"
        subtitle="Siapa melakukan apa dan kapan. Catatan ini tidak bisa diubah atau dihapus."
      />
      <nav aria-label="Saring jenis" className="rise -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {AUDIT_GROUPS.map(([value, label]) => (
          <Link
            key={value}
            href={value ? `/aktivitas?jenis=${value}` : "/aktivitas"}
            aria-current={jenis === value ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-bold transition ${
              jenis === value ? "bg-pitch text-white" : "bg-chalk text-ink-soft hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {rows.length ? (
        <ul className="rise grid gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 rounded-[1.5rem] bg-chalk p-4">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-mist text-ink-soft">
                <History aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">{r.label}</span>
                <span className="block text-sm text-ink-soft">{r.actor ?? "Sistem atau pendaftar"}</span>
              </span>
              <time dateTime={r.at} className="shrink-0 text-right text-xs font-semibold text-ink-soft">
                {fmt.format(new Date(r.at))}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Belum ada aktivitas">Perubahan data akademi akan tercatat di sini.</EmptyState>
      )}
    </div>
  );
}
