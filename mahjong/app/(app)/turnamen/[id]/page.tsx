import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { dayLabel } from "@/lib/dates";
import { isUuid } from "@/server/ids";
import { listMembers } from "@/server/members";
import { requirePage } from "@/server/routing";
import { getTournament } from "@/server/tournaments";
import { TournamentView } from "./tournament-view";

export const metadata: Metadata = { title: "Turnamen" };

export default async function TurnamenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("tournaments.read");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const t = await getTournament(ctx, id).catch(() => null);
  if (!t) notFound();
  const members = t.canManage && t.status === "draft" && ctx.can("members.read") ? await listMembers(ctx, "", 200) : [];
  return (
    <>
      <PageHeader title={t.name} subtitle={`${dayLabel(t.eventDate)} · ${t.rounds} babak · poin ${t.rankPoints.join("/")}`} back={{ href: "/turnamen", label: "Turnamen" }} />
      <TournamentView t={t} members={members.map((m) => ({ id: m.id, name: m.fullName }))} />
    </>
  );
}
