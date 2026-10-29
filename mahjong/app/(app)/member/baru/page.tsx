import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePage } from "@/server/routing";
import { getVenue } from "@/server/venue";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Member baru" };

export default async function MemberBaruPage() {
  const ctx = await requirePage("members.manage");
  const v = await getVenue(ctx);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Member baru" back={{ href: "/member", label: "Member" }} />
      <div className="tile rise p-6 sm:p-8"><MemberForm discounts={{ silver: v.settings.discountSilver, gold: v.settings.discountGold }} /></div>
    </div>
  );
}
