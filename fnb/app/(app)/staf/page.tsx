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
        <p className="font-bold text-tomato">Akses pengguna</p>
        <h1 className="text-3xl font-extrabold">Pegawai</h1>
        <p className="mt-1 text-stone-600">Undang pegawai, atur peran dan izinnya, atau nonaktifkan akses. Perubahan peran langsung berlaku.</p>
      </div>
      {can(ctx, "roles.manage") ? <Link href="/peran" className="ml-auto inline-flex h-11 items-center rounded-full bg-white px-5 font-extrabold shadow-sm">Kelola peran</Link> : null}
    </div>
    <StaffPanel initial={staff} invites={invites.map((i) => ({ ...i, expiresAt: i.expiresAt.toString() }))} customRoles={roles.map((r) => ({ id: r.id, name: r.name }))} selfId={ctx.membershipId} isOwner={ctx.roles.includes("owner")} />
  </main>;
}
