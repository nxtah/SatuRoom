import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AppError } from "@/server/errors";
import { requireAcademyPage } from "@/server/routing";
import { getTeam } from "@/server/teams";
import { TeamForm } from "../../team-form";
import { listLocations } from "@/server/locations";
import { programOptions } from "@/server/programs";
import { ArchiveTeam } from "./archive-team";

export const metadata: Metadata = { title: "Ubah tim" };

export default async function UbahTimPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  if (!ctx.can("teams.manage")) redirect(`/tim/${id}`);
  const team = await getTeam(ctx, id).catch((e) => {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  });
  return (
    <div className="max-w-xl">
      <PageHeader title="Ubah tim" back={{ href: `/tim/${id}`, label: team.name }} />
      <div className="rise rounded-[2rem] bg-chalk p-6 sm:p-8">
        <TeamForm locations={await listLocations(ctx)} programs={await programOptions(ctx)} team={team} next="/tim/{id}" />
      </div>
      <ArchiveTeam id={id} name={team.name} />
    </div>
  );
}
