import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requirePage } from "@/server/routing";
import { listTables } from "@/server/tables";
import { TableManager } from "./table-manager";

export const metadata: Metadata = { title: "Meja dan tarif" };

export default async function MejaSettingsPage() {
  const ctx = await requirePage("tables.manage");
  return (
    <>
      <PageHeader title="Meja dan tarif" subtitle="Tarif dicatat saat meja dibuka, jadi mengubahnya tidak memengaruhi sesi yang sedang main." back={{ href: "/pengaturan", label: "Lainnya" }} />
      <TableManager tables={await listTables(ctx)} />
    </>
  );
}
