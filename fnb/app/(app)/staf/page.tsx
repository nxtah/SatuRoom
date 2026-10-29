import Link from "next/link";
import { redirect } from "next/navigation";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";
import { listInvites } from "@/server/invitations";
import { listCustomRoles } from "@/server/roles";
import { listStaff } from "@/server/staff";
import { StaffPanel } from "./staff-panel";

export default async function StaffPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "staff.manage")) redirect("/");
  const [staff, roles, invites] = await Promise.all([listStaff(ctx), listCustomRoles(ctx), listInvites(ctx)]);
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0">
        <h1 className="text-3xl font-extrabold">Staf</h1>
        <p className="mt-1 text-stone-600">Atur siapa boleh mengerjakan apa. Perubahan peran langsung berlaku.</p>
      </div>
      {can(ctx, "roles.manage") ? <Link href="/peran" className="ml-auto inline-flex h-11 items-center rounded-full bg-white px-5 font-extrabold shadow-sm">Kelola peran</Link> : null}
    </div>
    <StaffPanel initial={staff} invites={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toString() }))} customRoles={roles.map((r) => ({ id: r.id, name: r.name }))} selfId={ctx.membershipId} isOwner={ctx.roles.includes("owner")} />
  </main>;
}
