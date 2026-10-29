import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireVenuePage } from "@/server/routing";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Undang staf" };

export default async function UndangStafPage() {
  const ctx = await requireVenuePage();
  if (!ctx.can("staff.manage")) redirect("/staf");
  return (
    <div className="max-w-2xl">
      <PageHeader title="Undang staf" back={{ href: "/staf", label: "Staf" }} />
      <div className="rise rounded-2xl tile p-6 sm:p-8">
        <InviteForm canGrantOwner={ctx.roles.includes("owner")} />
      </div>
    </div>
  );
}
