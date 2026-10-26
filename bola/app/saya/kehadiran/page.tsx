import type { Metadata } from "next";
import { Attendance } from "../page";
import { requirePlayerHome } from "../player-data";

export const metadata: Metadata = { title: "Kehadiran saya" };

export default async function PlayerAttendancePage() {
  const me = await requirePlayerHome();
  return (
    <div className="grid gap-4">
      <div className="rise">
        <p className="text-sm font-bold text-turf">Catatan latihan</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Kehadiran saya</h1>
        <p className="mt-1 text-ink-soft">Status ini dicatat oleh pelatih setelah latihan berlangsung.</p>
      </div>
      <div className="max-w-xl"><Attendance me={me} /></div>
    </div>
  );
}
