import { BookOpen, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { mobileNav, NAV } from "@/lib/nav";
import { getAcademy } from "@/server/academy";
import { requireAcademyPage } from "@/server/routing";
import { AcademyMark } from "@/components/academy-mark";
import { AcademyForm } from "./academy-form";
import { LogoForm } from "./logo-form";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const ctx = await requireAcademyPage();
  const academy = await getAcademy(ctx);
  const canEdit = ctx.can("academy.update");
  // Menu yang tidak muat di tab bawah HP dibuka dari sini.
  const allowed: string[] = [...NAV.filter((i) => !i.permission || ctx.can(i.permission)).map((i) => i.href), ...(ctx.can("locations.manage") ? ["/pengaturan/lokasi"] : [])];
  const inTabs = new Set<string>(mobileNav(allowed).map((i) => i.href));
  const HINTS: Record<string, { title: string; hint: string }> = {
    "/tim": { title: "Tim", hint: "Kelompok umur, pemain, dan pelatihnya." },
    "/staf": { title: "Staf dan peran", hint: "Undang pelatih, atur peran dan tim yang dipegang." },
    "/pengumuman": { title: "Pengumuman", hint: "Kabar libur, ganti jam, dan info untuk pemain." },
    "/pengaturan/lokasi": { title: "Lokasi", hint: "Lapangan atau cabang tempat latihan." },
    "/iuran": { title: "Iuran", hint: "Tarif, tagihan bulanan, dan pembayaran." },
    "/staf/peran": { title: "Peran dan izin", hint: "Buat jabatan sendiri dan atur aksesnya." },
    "/aktivitas": { title: "Jejak aktivitas", hint: "Siapa mengubah apa dan kapan." },
  };
  const more = allowed.filter((h) => !inTabs.has(h) && HINTS[h]).map((h) => ({ href: h, ...HINTS[h]! }));
  return (
    <div className="grid gap-5">
      <h1 className="rise pt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pengaturan</h1>

      {more.length ? (
        <nav aria-label="Menu lainnya" className="rise grid gap-2 md:hidden">
          {more.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="group flex items-center gap-4 rounded-[2rem] bg-pitch p-5 text-white transition hover:-translate-y-0.5"
            >
              <span className="flex-1">
                <span className="block text-lg font-extrabold">{m.title}</span>
                <span className="block text-sm text-white/70">{m.hint}</span>
              </span>
              <ChevronRight aria-hidden className="size-5" />
            </Link>
          ))}
        </nav>
      ) : null}

      <a
        href="/docs"
        target="_blank"
        rel="noopener"
        className="rise group flex items-center gap-4 rounded-[2rem] bg-ember/15 p-5 transition hover:-translate-y-0.5"
      >
        <BookOpen aria-hidden className="size-6 shrink-0 text-ink" />
        <span className="flex-1">
          <span className="block text-lg font-extrabold">Panduan pemakaian</span>
          <span className="block text-sm text-ink-soft">Cara pakai tiap menu, langkah demi langkah, dan solusi bila ada masalah.</span>
        </span>
        <ChevronRight aria-hidden className="size-5" />
      </a>

      {ctx.can("locations.manage") ? (
        <Link href="/pengaturan/lokasi" className="rise group hidden items-center gap-4 rounded-[2rem] bg-chalk p-5 transition hover:-translate-y-0.5 md:flex">
          <span className="flex-1">
            <span className="block text-lg font-extrabold">Lokasi</span>
            <span className="block text-sm text-ink-soft">Kelola lapangan atau cabang tempat latihan dan pertandingan.</span>
          </span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      ) : null}

      <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="profil">
        <h2 id="profil" className="text-xl font-extrabold">
          Profil akademi
        </h2>
        {canEdit ? (
          <>
            <div className="mt-5">
              <LogoForm logoUrl={academy.logoUrl} />
            </div>
            <AcademyForm name={academy.name} city={academy.city ?? ""} address={academy.address ?? ""} sport={academy.sport} sportLocked={academy.sportLocked} />
          </>
        ) : (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <AcademyMark name={academy.name} logoUrl={academy.logoUrl} className="size-16 rounded-2xl text-2xl" />
            </div>
            <div>
              <dt className="text-sm font-bold text-ink-soft">Nama akademi</dt>
              <dd className="mt-1 font-semibold">{academy.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-ink-soft">Kota</dt>
              <dd className="mt-1 font-semibold">{academy.city ?? "-"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-bold text-ink-soft">Alamat</dt>
              <dd className="mt-1 font-semibold">{academy.address ?? "-"}</dd>
            </div>
            <p className="text-sm text-ink-soft sm:col-span-2">Hanya pemilik akademi yang bisa mengubah profil.</p>
          </dl>
        )}
      </section>

      <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="akun">
        <h2 id="akun" className="text-xl font-extrabold">
          Akun saya
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-bold text-ink-soft">Nama</dt>
            <dd className="mt-1 font-semibold">{ctx.session.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-bold text-ink-soft">Email</dt>
            <dd className="mt-1 font-semibold break-all">{ctx.session.email}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
