import type { Metadata } from "next";
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
