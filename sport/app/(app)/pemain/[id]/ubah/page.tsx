import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireAcademyPage } from "@/server/routing";
import { listTeams } from "@/server/teams";
import { loadPlayer } from "../../load";
import { sportOf } from "@/lib/sports";
import { PlayerForm } from "../../player-form";

export const metadata: Metadata = { title: "Ubah pemain" };

export default async function UbahPemainPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  if (!ctx.can("players.manage")) redirect(`/pemain/${id}`);
  const [p, teams] = await Promise.all([loadPlayer(ctx, id), listTeams(ctx)]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Ubah pemain" back={{ href: `/pemain/${id}`, label: p.fullName }} />
      <div className="rise rounded-[2rem] bg-chalk p-6 sm:p-8">
        <PlayerForm
          positions={sportOf(ctx.sport).positions}
          teams={teams}
          showGuardian={p.guardian !== null}
          player={{
            id,
            fullName: p.fullName,
            birthDate: p.birthDate,
            position: p.position,
            shirtNumber: p.shirtNumber,
            teamIds: p.teams.map((t) => t.id),
            guardianName: p.guardian?.name ?? null,
            guardianPhone: p.guardian?.phone ?? null,
          }}
          next="/pemain/{id}"
        />
      </div>
    </div>
  );
}
