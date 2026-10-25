import { ChevronRight, IdCard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getAcademy } from "@/server/academy";
import { requireAcademyPage } from "@/server/routing";
import { AcademyForm } from "./academy-form";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const ctx = await requireAcademyPage();
  const academy = await getAcademy(ctx);
  const canEdit = ctx.can("academy.update");
  return (
    <div className="grid gap-5">
      <h1 className="rise pt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Pengaturan</h1>

      {ctx.can("staff.read") ? (
        <Link
          href="/staf"
          className="rise group flex items-center gap-4 rounded-[2rem] bg-pitch p-6 text-white transition hover:-translate-y-0.5 lg:hidden"
        >
          <IdCard aria-hidden className="size-6 shrink-0" />
          <span className="flex-1">
            <span className="block text-lg font-extrabold">Staf dan peran</span>
            <span className="block text-sm text-white/70">Undang pelatih, atur peran dan tim yang dipegang.</span>
          </span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      ) : null}

      <section className="rise rounded-[2rem] bg-chalk p-6 sm:p-8" aria-labelledby="profil">
        <h2 id="profil" className="text-xl font-extrabold">
          Profil akademi
        </h2>
        {canEdit ? (
          <AcademyForm name={academy.name} city={academy.city ?? ""} />
        ) : (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-bold text-ink-soft">Nama akademi</dt>
              <dd className="mt-1 font-semibold">{academy.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold text-ink-soft">Kota</dt>
              <dd className="mt-1 font-semibold">{academy.city ?? "-"}</dd>
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
