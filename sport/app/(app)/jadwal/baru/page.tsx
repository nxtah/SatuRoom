import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { inAcademy } from "@/server/context";
import { requireAcademyPage } from "@/server/routing";
import { academyToday, canPlan } from "@/server/schedule";
import { listTeams } from "@/server/teams";
import { SessionForm } from "./session-form";

export const metadata: Metadata = { title: "Tambah sesi" };

export default async function SesiBaruPage() {
  const ctx = await requireAcademyPage();
  const [teams, today] = await Promise.all([listTeams(ctx), inAcademy(ctx, academyToday)]);
  if (!canPlan(ctx, teams.length)) redirect("/jadwal");
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Tambah sesi"
        subtitle="Latihan tambahan atau pertandingan di luar jadwal rutin."
        back={{ href: "/jadwal", label: "Jadwal" }}
      />
      <div className="rise rounded-[2rem] bg-chalk p-6 sm:p-8">
        <SessionForm teams={teams} today={today} />
      </div>
    </div>
  );
}
