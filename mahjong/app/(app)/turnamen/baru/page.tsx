import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePage } from "@/server/routing";
import { TournamentForm } from "./tournament-form";

export const metadata: Metadata = { title: "Turnamen baru" };

export default async function TurnamenBaruPage() {
  await requirePage("tournaments.manage");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return (
    <div className="max-w-2xl">
      <PageHeader title="Turnamen baru" back={{ href: "/turnamen", label: "Turnamen" }} />
      <div className="tile rise p-6 sm:p-8"><TournamentForm today={today} /></div>
    </div>
  );
}
