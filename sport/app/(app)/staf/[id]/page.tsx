import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { AppError } from "@/server/errors";
import { isUuid } from "@/server/ids";
import { requireAcademyPage } from "@/server/routing";
import { getStaffMember } from "@/server/staff";
import { listTeams } from "@/server/teams";
import { listCustomRoles } from "@/server/roles";
import { StaffForm } from "./staff-form";

export const metadata: Metadata = { title: "Ubah staf" };

export default async function StaffMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAcademyPage();
  const { id } = await params;
  if (!ctx.can("staff.manage") || id === ctx.membershipId) redirect("/staf");
  if (!isUuid(id)) notFound();
  const [member, teams, customRoles] = await Promise.all([
    getStaffMember(ctx, id).catch((e) => {
      if (e instanceof AppError && e.status === 404) notFound();
      throw e;
    }),
    listTeams(ctx),
    listCustomRoles(ctx),
  ]);
  const isOwner = ctx.roles.includes("owner");
  // Hanya Pemilik yang boleh mengubah Pemilik lain.
  if (member.roles.includes("owner") && !isOwner) redirect("/staf");
  return (
    <div className="max-w-2xl">
      <PageHeader title={member.name} subtitle={member.email} back={{ href: "/staf", label: "Staf" }} />
      <StaffForm
        id={id}
        name={member.name.split(" ")[0] ?? member.name}
        roles={member.roles}
        customRoles={customRoles}
        customRoleIds={member.customRoles.map((c) => c.id)}
        teamIds={member.teams.map((t) => t.id)}
        teams={teams}
        canGrantOwner={isOwner}
        active={member.status === "active"}
      />
    </div>
  );
}
