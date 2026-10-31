import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { listModules } from "@/server/modules";
import { requireAcademyPage } from "@/server/routing";
import { ModuleList } from "./module-list";

export const metadata: Metadata = { title: "Modul" };

export default async function ModulPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.can("modules.manage")) redirect("/pengaturan");
  const modules = await listModules(ctx);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Modul"
        subtitle="Nyalakan hanya fitur yang dipakai akademi Anda supaya menu tetap ringkas. Mematikan modul tidak menghapus datanya."
        back={{ href: "/pengaturan", label: "Pengaturan" }}
      />
      <ModuleList modules={modules} />
    </div>
  );
}
