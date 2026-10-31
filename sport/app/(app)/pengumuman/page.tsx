import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getAcademy } from "@/server/academy";
import { announcementTargets, listAnnouncements } from "@/server/announcements";
import { requireAcademyPage } from "@/server/routing";
import { listTeams } from "@/server/teams";
import { AnnouncementBoard } from "./announcement-board";

export const metadata: Metadata = { title: "Pengumuman" };

export default async function PengumumanPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("announcements")) redirect("/");
  const [items, targets, teams, academy] = await Promise.all([
    listAnnouncements(ctx),
    announcementTargets(ctx),
    listTeams(ctx),
    getAcademy(ctx),
  ]);
  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }));
  const canWrite = targets.all || teamOptions.length > 0;
  return (
    <>
      <PageHeader
        title="Pengumuman"
        subtitle="Kabar untuk pemain. Muncul di akun pemain dan bisa dibagikan ke WhatsApp."
      />
      <AnnouncementBoard
        items={items}
        teams={teamOptions}
        canWrite={canWrite}
        allAcademy={targets.all}
        academyName={academy.name}
      />
    </>
  );
}
