import { redirect } from "next/navigation";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";
import { listCustomRoles } from "@/server/roles";
import { RolesPanel } from "./roles-panel";

export default async function RolesPage() {
  const ctx = await requireFnbPage();
  if (!can(ctx, "roles.manage")) redirect("/");
  return <main className="mx-auto max-w-5xl p-4 sm:p-8">
    <h1 className="text-3xl font-extrabold">Peran custom</h1>
    <p className="mt-1 text-stone-600">Buat peran sendiri dengan izin yang dipilih, lalu pasang ke staf di halaman Staf.</p>
    <RolesPanel initial={await listCustomRoles(ctx)} mine={[...ctx.permissions]} />
  </main>;
}
