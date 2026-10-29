import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { currentSession } from "@/server/context";
import { listMyVenues } from "@/server/venue";
import { VenuePicker } from "./picker";

export const metadata: Metadata = { title: "Pilih tempat" };

export default async function PilihTempatPage() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const venues = await listMyVenues(session.userId);
  if (venues.length === 0) redirect("/mulai");
  return (
    <div className="min-h-dvh bg-chalk px-5 py-6">
      <Brand />
      <main className="mx-auto max-w-lg py-14">
        <h1 className="text-3xl font-bold">Buka tempat yang mana?</h1>
        <p className="mt-2 text-ink-soft">Anda terdaftar di {venues.length} tempat. Bisa ganti kapan saja dari menu atas.</p>
        <VenuePicker venues={venues} />
      </main>
    </div>
  );
}
