import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireAcademyPage } from "@/server/routing";
import { TeamForm } from "../team-form";

export const metadata: Metadata = { title: "Buat tim" };

export default async function TimBaruPage({ searchParams }: { searchParams: Promise<{ dari?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.can("teams.manage")) redirect("/tim");
  // Dari Beranda (persiapan), lanjut ke tambah pemain agar alur pertama mulus.
  const fromSetup = (await searchParams).dari === "persiapan";
  return (
    <div className="max-w-xl">
      <PageHeader title="Buat tim" subtitle="Satu tim biasanya satu kelompok umur." back={{ href: "/tim", label: "Tim" }} />
      <div className="rise rounded-[2rem] bg-chalk p-6 sm:p-8">
        <TeamForm next={fromSetup ? "/pemain/baru?tim={id}&dari=persiapan" : "/tim/{id}"} />
      </div>
    </div>
  );
}
