"use client";

import { Crown } from "lucide-react";
import { useEffect, useState } from "react";

/** Contoh papan lantai untuk halaman perkenalan: jam berjalan sungguhan, data contoh. */
const DEMO = [
  { name: "Meja 1", rate: 40000, since: 5_420, who: "Koh Ahong +3", kind: "auto" },
  { name: "Meja 2", rate: 40000, since: 1_980, who: "Mei Ling (Gold)", kind: "auto" },
  { name: "Meja 3", rate: 30000, since: null, who: "", kind: "manual" },
  { name: "VIP", rate: 75000, since: 900, who: "Rombongan Pak Budi", kind: "vip" },
] as const;

const rp = (n: number) => `Rp ${Math.round(n / 500) * 500 >= 1000 ? (Math.round(n / 500) * 500).toLocaleString("id-ID") : "0"}`;

export function LandingFloor() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <ul className="grid grid-cols-2 gap-3" aria-label="Contoh papan lantai">
      {DEMO.map((d) => {
        const sec = d.since === null ? 0 : d.since + t;
        const hh = String(Math.floor(sec / 3600)).padStart(2, "0");
        const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
        const ss = String(sec % 60).padStart(2, "0");
        const steps = Math.max(2, Math.ceil(sec / 1800));
        return (
          <li key={d.name} className={`rounded-xl p-4 ${d.since === null ? "bg-chalk text-ink shadow-[0_4px_0_var(--color-edge)]" : "bg-pitch-2 text-white shadow-[0_4px_0_var(--color-night)]"}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 font-bold" style={{ fontFamily: "var(--font-display)" }}>{d.kind === "vip" ? <Crown aria-hidden className="size-3.5 text-sun" /> : null}{d.name}</p>
              <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${d.since === null ? "text-turf" : "text-white/80"}`}><i className={`size-2 rounded-sm ${d.since === null ? "bg-turf" : "bg-ember pulse-dot"}`} />{d.since === null ? "Kosong" : "Main"}</span>
            </div>
            {d.since === null ? (
              <p className="mt-6 text-sm text-ink-soft">Siap dipakai. Booking 20.00: Bu Rina (4).</p>
            ) : (
              <>
                <p className="tnum mt-3 text-2xl font-extrabold sm:text-3xl">{hh}:{mm}<span className="text-white/45">:{ss}</span></p>
                <p className="truncate text-xs text-white/70">{d.who}</p>
                <p className="tnum mt-3 border-t border-white/15 pt-2 text-sm font-extrabold">{rp((d.rate * steps) / 2)}</p>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
