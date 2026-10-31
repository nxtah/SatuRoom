import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { listPrograms } from "@/server/programs";
import { requireAcademyPage } from "@/server/routing";
import { ProgramBoard } from "./program-board";

export const metadata: Metadata = { title: "Program" };

export default async function ProgramPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("programs")) redirect("/");
  const programs = await listPrograms(ctx);
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Program latihan"
        subtitle="Kelompokkan tim ke program seperti Reguler, Elite, atau Kiper. Pasang program saat membuat atau mengubah tim."
      />
      <ProgramBoard programs={programs} canManage={ctx.can("programs.manage")} canEditTeams={ctx.can("teams.manage")} />
    </div>
  );
}
