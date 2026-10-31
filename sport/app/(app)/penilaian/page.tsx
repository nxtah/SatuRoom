import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { sportOf } from "@/lib/sports";
import { listTemplates } from "@/server/assessments";
import { requireAcademyPage } from "@/server/routing";
import { TemplateManager } from "./template-manager";

export const metadata: Metadata = { title: "Penilaian" };

export default async function PenilaianPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.modules.has("evaluations") || !ctx.can("evaluations.write")) redirect("/");
  const families = await listTemplates(ctx);
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Penilaian"
        subtitle={`Template ukuran penilaian ${sportOf(ctx.sport).label.toLowerCase()}: keterampilan (nilai 1-5) dan tes fisik (angka). Nilai pemain diisi dari halaman pemain.`}
      />
      <TemplateManager families={families} canManage={ctx.can("evaluations.manage_all")} />
    </div>
  );
}
