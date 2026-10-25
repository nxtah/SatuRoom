import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { listMyAcademies } from "@/server/academy";
import { currentSession } from "@/server/context";
import { AcademyPicker } from "./picker";

export const metadata: Metadata = { title: "Pilih akademi" };

export default async function PilihAkademiPage() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const academies = await listMyAcademies(session.userId);
  if (academies.length === 0) redirect("/mulai");
  return (
    <div className="min-h-dvh bg-chalk px-5 py-6">
      <Brand />
      <main className="mx-auto max-w-lg py-14">
        <h1 className="text-3xl font-extrabold tracking-tight">Buka akademi yang mana?</h1>
        <p className="mt-2 text-ink-soft">Anda terdaftar di {academies.length} akademi. Bisa ganti kapan saja dari menu atas.</p>
        <AcademyPicker academies={academies} />
      </main>
    </div>
  );
}
