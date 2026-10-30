import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicMenu } from "@/server/public-menu";
import { MenuLive } from "./menu-live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu", robots: { index: false, follow: false } };

export default async function PublicMenuPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const menu = await publicMenu(code);
  if (!menu) notFound();
  return <MenuLive code={code} initial={menu} />;
}
