import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAcademyPage } from "@/server/routing";
import { listTickets } from "@/server/support";
import { TicketList } from "./parts";

export const metadata: Metadata = { title: "Layanan orang tua" };

export default async function LayananPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("support") || !ctx.can("support.manage")) redirect("/");
  const tab = (await searchParams).tab === "selesai" ? "closed" : "active";
  const tickets = await listTickets(ctx, tab);
  const rated = tab === "closed" ? tickets.filter((t) => t.rating) : [];
  const avg = rated.length ? rated.reduce((s, t) => s + t.rating!, 0) / rated.length : null;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Layanan orang tua" subtitle="Pertanyaan, keluhan, dan masukan yang dikirim orang tua dari akun pemain. Balasan Anda langsung muncul di akun mereka." />
      <nav aria-label="Status pesan" className="rise mb-4 flex flex-wrap items-center gap-2">
        {[
          { k: "active", l: "Perlu ditangani", h: "/layanan" },
          { k: "closed", l: "Selesai", h: "/layanan?tab=selesai" },
        ].map((t) => (
          <Link key={t.k} href={t.h} aria-current={tab === t.k ? "page" : undefined} className={`flex h-11 items-center rounded-full px-4 font-bold ${tab === t.k ? "bg-pitch text-white" : "bg-chalk hover:bg-mist"}`}>
            {t.l}
          </Link>
        ))}
        {avg !== null ? <span className="ml-auto text-sm font-bold">Rata-rata nilai {avg.toFixed(1)} dari 5 ({rated.length})</span> : null}
      </nav>
      {tickets.length === 0 ? (
        <EmptyState title={tab === "active" ? "Tidak ada pesan yang menunggu" : "Belum ada pesan selesai"}>
          Orang tua mengirim pesan dari menu Layanan di akun pemain.
        </EmptyState>
      ) : (
        <TicketList tickets={tickets} />
      )}
    </div>
  );
}
