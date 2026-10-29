import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { requirePage } from "@/server/routing";
import { floorBoard } from "@/server/tables";
import { getVenue } from "@/server/venue";
import { FloorBoard } from "./floor-board";

export const metadata: Metadata = { title: "Lantai" };

export default async function MejaPage() {
  const ctx = await requirePage("floor.view");
  const [board, venue] = await Promise.all([floorBoard(ctx), getVenue(ctx)]);
  return (
    <>
      <PageHeader title="Lantai" subtitle="Semua meja sekarang. Ketuk meja kosong untuk mulai, ketuk meja main untuk pesanan dan bayar." />
      {board.tables.length ? (
        <FloorBoard initial={board} timezone={venue.timezone} canRun={ctx.can("sessions.run")} />
      ) : (
        <EmptyState title="Belum ada meja" action={ctx.can("tables.manage") ? <Link href="/pengaturan/meja"><Button>Tambah meja</Button></Link> : undefined}>
          Tambahkan meja dulu supaya bisa dibuka.
        </EmptyState>
      )}
    </>
  );
}
