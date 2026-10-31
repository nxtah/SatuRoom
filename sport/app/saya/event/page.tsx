import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { parentEvents } from "@/server/parent-portal";
import { ParentEvents } from "./events";

export const metadata: Metadata = { title: "Event" };

export default async function PlayerEventsPage() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const events = await parentEvents(session).catch(() => null);
  if (!events) redirect("/saya");
  return (
    <div className="grid gap-4">
      <div className="rise">
        <p className="text-sm font-bold text-turf">Kegiatan akademi</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Event dan turnamen</h1>
        <p className="mt-1 text-ink-soft">Daftar di sini. Bila ada biaya, bayar tunai atau transfer ke akademi.</p>
      </div>
      <ParentEvents events={events} />
    </div>
  );
}
