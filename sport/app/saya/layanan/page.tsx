import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { parentTickets } from "@/server/parent-portal";
import { ParentSupport } from "./support";

export const metadata: Metadata = { title: "Layanan" };

export default async function PlayerSupportPage() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const tickets = await parentTickets(session).catch(() => null);
  if (!tickets) redirect("/saya");
  return (
    <div className="grid gap-4">
      <div className="rise">
        <p className="text-sm font-bold text-turf">Hubungi akademi</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Layanan</h1>
        <p className="mt-1 text-ink-soft">Tanya jadwal, sampaikan keluhan, atau beri masukan. Balasan muncul di sini dan di lonceng notifikasi.</p>
      </div>
      <ParentSupport tickets={tickets} />
    </div>
  );
}
