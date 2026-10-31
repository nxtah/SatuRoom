import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { sportOf } from "@/lib/sports";
import { listLocations } from "@/server/locations";
import { listBranches } from "@/server/branches";
import { requireAcademyPage } from "@/server/routing";
import { LocationManager } from "./location-manager";

export const metadata: Metadata = { title: "Lokasi" };

export default async function LokasiPage() {
  const ctx = await requireAcademyPage();
  const [locations, branches] = await Promise.all([listLocations(ctx), listBranches(ctx)]);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Lokasi"
        subtitle={`${sportOf(ctx.sport).venue} atau cabang tempat latihan dan pertandingan. Pilih saat membuat jadwal; bentrok jam otomatis dicegah.`}
        back={{ href: "/pengaturan", label: "Pengaturan" }}
      />
      <LocationManager locations={locations} canManage={ctx.can("locations.manage")} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
    </div>
  );
}
