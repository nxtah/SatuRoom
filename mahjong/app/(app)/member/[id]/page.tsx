import { ArrowDownLeft, ArrowUpRight, Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { METHOD_LABEL, TIER_LABEL } from "@/lib/billing";
import { dayLabel } from "@/lib/dates";
import { rupiah, whatsappLink } from "@/lib/money";
import { isUuid } from "@/server/ids";
import { getMember } from "@/server/members";
import { requirePage } from "@/server/routing";
import { getVenue } from "@/server/venue";
import { MemberForm } from "../member-form";
import { TopUpForm } from "./topup-form";

export const metadata: Metadata = { title: "Member" };

export default async function MemberDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ubah?: string }> }) {
  const ctx = await requirePage("members.read");
  const { id } = await params;
  const { ubah } = await searchParams;
  if (!isUuid(id)) notFound();
  const m = await getMember(ctx, id).catch(() => null);
  if (!m) notFound();
  const manage = ctx.can("members.manage");
  const v = await getVenue(ctx);

  if (ubah === "1" && manage)
    return (
      <div className="max-w-2xl">
        <PageHeader title={`Ubah ${m.fullName}`} back={{ href: `/member/${id}`, label: "Kembali" }} />
        <div className="tile rise p-6 sm:p-8"><MemberForm id={id} initial={m} discounts={{ silver: v.settings.discountSilver, gold: v.settings.discountGold }} /></div>
      </div>
    );

  return (
    <>
      <PageHeader title={m.fullName} subtitle={`${TIER_LABEL[m.tier]} · bergabung ${dayLabel(m.joinedOn)}`} back={{ href: "/member", label: "Member" }}
        action={manage ? <ButtonLink href={`/member/${id}?ubah=1`} variant="outline"><Pencil aria-hidden className="size-4" /> Ubah</ButtonLink> : undefined} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-5">
          <section className="felt rise rounded-2xl p-6 text-white shadow-[0_4px_0_var(--color-night)]">
            <p className="text-sm font-bold text-white/70">Saldo</p>
            <p className="tnum text-5xl font-extrabold">{rupiah(m.balance)}</p>
            <p className="mt-2 text-white/70">{m.visits} kunjungan · total belanja {rupiah(m.totalSpent)}</p>
            {m.phone ? <a href={whatsappLink(m.phone, `Halo ${m.fullName}, dari ${v.name}.`)} className="mt-3 inline-block font-bold underline underline-offset-4">Kirim WhatsApp ke {m.phone}</a> : null}
            {m.note ? <p className="mt-3 text-sm text-white/80">Catatan: {m.note}</p> : null}
          </section>
          <section className="tile rise p-5">
            <h2 className="text-lg font-extrabold">Kunjungan terakhir</h2>
            {m.recent.length ? (
              <ul className="tnum mt-2 divide-y divide-line">
                {m.recent.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3 py-2.5"><span>{dayLabel(r.date)} · {r.tableName} · {Math.round(r.minutes / 6) / 10} jam</span><b>{rupiah(r.total)}</b></li>
                ))}
              </ul>
            ) : <p className="mt-2 text-ink-soft">Belum pernah main.</p>}
          </section>
        </div>
        <div className="grid content-start gap-5">
          {manage ? <TopUpForm memberId={id} /> : null}
          <section className="tile rise p-5">
            <h2 className="text-lg font-extrabold">Riwayat saldo</h2>
            {m.ledger.length ? (
              <ul className="tnum mt-2 divide-y divide-line">
                {m.ledger.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    {l.amount >= 0 ? <ArrowDownLeft aria-hidden className="size-4 text-turf" /> : <ArrowUpRight aria-hidden className="size-4 text-ember" />}
                    <span className="min-w-0 flex-1"><span className="block">{l.kind === "topup" ? "Isi saldo" : l.kind === "spend" ? "Bayar meja" : l.kind === "refund" ? "Pengembalian" : "Penyesuaian"}{l.method ? ` · ${METHOD_LABEL[l.method as keyof typeof METHOD_LABEL] ?? l.method}` : ""}</span><span className="block text-xs text-ink-soft">{l.at.slice(0, 10)}{l.note ? ` · ${l.note}` : ""}</span></span>
                    <b className={l.amount >= 0 ? "text-turf" : ""}>{l.amount >= 0 ? "+" : "-"}{rupiah(Math.abs(l.amount))}</b>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-ink-soft">Belum ada transaksi saldo.</p>}
          </section>
        </div>
      </div>
    </>
  );
}
