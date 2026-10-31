import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PERMISSIONS } from "@/server/permissions";
import { requireAcademyPage } from "@/server/routing";
import { listCustomRoles } from "@/server/roles";
import { RolesPanel } from "./roles-panel";

export const metadata: Metadata = { title: "Peran dan izin" };

export default async function PeranPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.can("roles.manage")) redirect("/staf");
  const roles = await listCustomRoles(ctx);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Peran dan izin"
        subtitle="Buat jabatan sendiri, misalnya Admin pendaftaran atau Asisten pelatih, lalu centang apa saja yang boleh dilakukan."
        back={{ href: "/staf", label: "Staf" }}
      />
      <RolesPanel initial={roles} mine={PERMISSIONS.filter((p) => ctx.can(p))} />
    </div>
  );
}
