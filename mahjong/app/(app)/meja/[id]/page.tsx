import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { isUuid } from "@/server/ids";
import { requirePage } from "@/server/routing";
import { listMenu } from "@/server/menu";
import { floorBoard } from "@/server/tables";
import { getSession } from "@/server/sessions";
import { SessionView } from "./session-view";

export const metadata: Metadata = { title: "Meja" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("floor.view");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await getSession(ctx, id).catch(() => null);
  if (!session) notFound();
  const [menu, board] = await Promise.all([
    ctx.can("orders.add") ? listMenu(ctx) : Promise.resolve([]),
    session.status === "open" ? floorBoard(ctx) : Promise.resolve(null),
  ]);
  return (
    <>
      <PageHeader title={session.tableName} subtitle={session.status === "open" ? "Sedang main" : session.status === "closed" ? "Sudah dibayar" : "Dibatalkan"} back={{ href: "/meja", label: "Lantai" }} />
      <SessionView
        initial={session}
        menu={menu.filter((m) => m.isAvailable)}
        freeTables={board?.tables.filter((t) => t.status === "free").map((t) => ({ id: t.id, name: t.name, rate: t.ratePerHour })) ?? []}
        can={{ order: ctx.can("orders.add"), run: ctx.can("sessions.run"), manage: ctx.can("settings.manage") }}
      />
    </>
  );
}
