import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { listBranches } from "@/server/branches";
import { requireAcademyPage } from "@/server/routing";
import { BranchManager } from "./branch-manager";

export const metadata: Metadata = { title: "Cabang" };

export default async function CabangPage() {
  const ctx = await requireAcademyPage();
  if (!ctx.can("branches.manage")) redirect("/pengaturan");
  const branches = await listBranches(ctx);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Cabang"
        subtitle="Punya tempat latihan di beberapa kota atau area? Buat cabang. Tim, pemain, jadwal, dan iuran ikut cabang lewat lokasinya, dan staf bisa dibatasi ke cabang tertentu."
        back={{ href: "/pengaturan", label: "Pengaturan" }}
      />
      <BranchManager branches={branches} canCreate={ctx.branchIds === null} />
    </div>
  );
}
