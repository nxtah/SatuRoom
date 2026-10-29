import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireAcademyPage } from "@/server/routing";
import { listTeams } from "@/server/teams";
import { sportOf } from "@/lib/sports";
import { PlayerForm } from "../player-form";

export const metadata: Metadata = { title: "Tambah pemain" };

export default async function PemainBaruPage({ searchParams }: { searchParams: Promise<{ tim?: string; dari?: string }> }) {
  const ctx = await requireAcademyPage();
  if (!ctx.can("players.manage")) redirect("/pemain");
  const teams = await listTeams(ctx);
  if (teams.length === 0) redirect("/tim/baru?dari=persiapan");
  const sp = await searchParams;
  const defaultTeamId = teams.some((t) => t.id === sp.tim) ? sp.tim : undefined;
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Tambah pemain"
        subtitle="Wajib: nama, tanggal lahir, dan tim. Sisanya bisa nanti."
        back={defaultTeamId ? { href: `/tim/${defaultTeamId}`, label: "Tim" } : { href: "/pemain", label: "Pemain" }}
      />
      <div className="rise rounded-[2rem] bg-chalk p-6 sm:p-8">
        <PlayerForm
          positions={sportOf(ctx.sport).positions}
          teams={teams}
          showGuardian={ctx.can("guardians.read")}
          defaultTeamId={defaultTeamId}
          next={sp.dari === "persiapan" ? "/?siap=1" : "/pemain/{id}"}
          addAnother
        />
      </div>
    </div>
  );
}
