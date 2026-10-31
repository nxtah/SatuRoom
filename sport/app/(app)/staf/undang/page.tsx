import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireAcademyPage } from "@/server/routing";
import { listTeams } from "@/server/teams";
import { listCustomRoles } from "@/server/roles";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Undang staf" };

export default async function UndangStafPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.can("staff.manage")) redirect("/staf");
  const [teams, customRoles] = await Promise.all([listTeams(ctx), listCustomRoles(ctx)]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Undang staf" back={{ href: "/staf", label: "Staf" }} />
      <div className="rise rounded-[2rem] bg-chalk p-6 sm:p-8">
        <InviteForm teams={teams} canGrantOwner={ctx.roles.includes("owner")} customRoles={customRoles} />
      </div>
    </div>
  );
}
