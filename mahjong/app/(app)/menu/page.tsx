import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { listMenu } from "@/server/menu";
import { requirePage } from "@/server/routing";
import { MenuManager } from "./menu-manager";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const ctx = await requirePage("menu.manage");
  return (
    <>
      <PageHeader title="Menu" subtitle="Minuman dan camilan yang bisa dipesan dari meja. Stok berkurang otomatis." />
      <MenuManager items={await listMenu(ctx)} />
    </>
  );
}
