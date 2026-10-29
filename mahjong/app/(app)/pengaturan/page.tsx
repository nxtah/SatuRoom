import { Armchair as ArmchairIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NAV } from "@/lib/nav";
import { requireVenuePage } from "@/server/routing";
import { getVenue } from "@/server/venue";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Lainnya" };

export default async function PengaturanPage() {
  const ctx = await requireVenuePage();
  const venue = await getVenue(ctx);
  const more = NAV.filter((i) => i.href !== "/" && i.href !== "/pengaturan" && (!i.permission || ctx.can(i.permission)));
  return (
    <>
      <PageHeader title="Lainnya" subtitle={venue.name} />
      <ul className="rise mb-6 grid grid-cols-2 gap-3 md:hidden">
        {more.map((i) => (
          <li key={i.href}><Link href={i.href} className="tile tile-press block p-4 font-extrabold">{i.label}</Link></li>
        ))}
      </ul>
      {ctx.can("tables.manage") ? (
        <Link href="/pengaturan/meja" className="tile tile-press rise mb-5 flex items-center gap-4 p-5">
          <ArmchairIcon aria-hidden className="size-6 text-ember" />
          <span className="flex-1"><b className="block">Meja dan tarif</b><span className="text-sm text-ink-soft">Nama meja, jenis, kursi, tarif per jam, perawatan.</span></span>
        </Link>
      ) : null}
      {ctx.can("settings.manage") ? (
        <div className="tile rise max-w-2xl p-6 sm:p-8">
          <h2 className="mb-5 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Aturan tempat</h2>
          <SettingsForm venue={venue} />
        </div>
      ) : <p className="text-ink-soft">Pengaturan tempat hanya bisa diubah Pemilik dan Manajer.</p>}
    </>
  );
}
