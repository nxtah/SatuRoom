import { AppShell } from "@/components/app-shell";
import { NAV } from "@/lib/nav";
import { ROLE_LABEL, ROLES } from "@/server/permissions";
import { requireVenuePage } from "@/server/routing";
import { getVenue, listMyVenues } from "@/server/venue";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireVenuePage();
  const [venue, venues] = await Promise.all([getVenue(ctx), listMyVenues(ctx.userId)]);
  const top = ROLES.find((r) => ctx.roles.includes(r));
  return (
    <AppShell
      venueName={venue.name}
      venues={venues}
      activeVenueId={ctx.businessId}
      user={{ name: ctx.session.name, email: ctx.session.email }}
      roleLabel={top ? ROLE_LABEL[top] : "Anggota"}
      allowed={NAV.filter((i) => !i.permission || ctx.can(i.permission)).map((i) => i.href)}
    >
      {children}
    </AppShell>
  );
}
