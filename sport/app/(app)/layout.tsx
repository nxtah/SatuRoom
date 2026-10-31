import { AppShell } from "@/components/app-shell";
import { allowedHrefs } from "@/lib/nav";
import { sportOf } from "@/lib/sports";
import { getAcademy, listMyAcademies } from "@/server/academy";
import { ROLE_LABEL, ROLES } from "@/server/permissions";
import { requireAcademyPage } from "@/server/routing";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAcademyPage();
  const [academy, academies] = await Promise.all([getAcademy(ctx), listMyAcademies(ctx.userId)]);
  // Peran tertinggi ditampilkan di header; semua peran terlihat di halaman Staf nanti.
  const top = ROLES.find((r) => ctx.roles.includes(r));
  return (
    <AppShell
      academyName={academy.name}
      logoUrl={academy.logoUrl}
      academies={academies}
      activeAcademyId={ctx.businessId}
      user={{ name: ctx.session.name, email: ctx.session.email }}
      roleLabel={top ? ROLE_LABEL[top] : (ctx.customRoleNames[0] ?? "Anggota")}
      accent={sportOf(ctx.sport).accent}
      allowed={allowedHrefs(ctx.can, ctx.modules)}
    >
      {children}
    </AppShell>
  );
}
