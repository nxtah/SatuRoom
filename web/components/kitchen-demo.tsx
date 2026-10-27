"use client";

import { ChefHat } from "lucide-react";
import { useState } from "react";
import { PhoneFrame } from "./phone-frame";

type Step = "baru" | "dimasak" | "siap";

const NEXT: Record<Step, { label: string; to: Step | null }> = {
  baru: { label: "Mulai masak", to: "dimasak" },
  dimasak: { label: "Tandai siap", to: "siap" },
  siap: { label: "Siap diantar", to: null },
};
const BADGE: Record<Step, string> = {
  baru: "bg-saffron text-kitchen",
  dimasak: "bg-tomato text-white",
  siap: "bg-basil text-white",
};
const LABEL: Record<Step, string> = { baru: "Baru masuk", dimasak: "Dimasak", siap: "Siap" };

// Pesanan fiktif untuk contoh.
const TICKETS = [
  { id: "m4", table: "Meja 4", items: "2 Nasi goreng, 1 Es teh", start: "baru" as Step },
  { id: "m7", table: "Meja 7", items: "1 Mie kuah, 2 Kopi susu", start: "dimasak" as Step },
  { id: "bw", table: "Bawa pulang", items: "3 Roti bakar", start: "baru" as Step },
];

export function KitchenDemo() {
  const [steps, setSteps] = useState<Record<string, Step>>(() =>
    Object.fromEntries(TICKETS.map((t) => [t.id, t.start])),
  );
  const ready = Object.values(steps).filter((s) => s === "siap").length;

  return (
    <PhoneFrame tone="kitchen" label="Contoh layar dapur yang bisa dicoba">
      <div className="bg-plate px-4 pt-11 pb-5 text-ink">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-ink-soft">Pesanan masuk</p>
            <p className="font-display text-lg leading-tight font-extrabold">Layar dapur</p>
          </div>
          <span className="rounded-full bg-chalk px-2.5 py-1 text-[11px] font-bold text-ink-soft">Contoh</span>
        </div>
        <ul className="mt-3 grid gap-2.5">
          {TICKETS.map((t) => {
            const step = steps[t.id]!;
            const next = NEXT[step];
            return (
              <li key={t.id} className="rounded-2xl bg-chalk p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-base font-extrabold">{t.table}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${BADGE[step]}`}>{LABEL[step]}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{t.items}</p>
                <button
                  type="button"
                  disabled={!next.to}
                  onClick={() => next.to && setSteps((s) => ({ ...s, [t.id]: next.to! }))}
                  className="mt-2.5 h-10 w-full rounded-full bg-kitchen text-sm font-bold text-white transition hover:bg-kitchen-2 active:scale-[0.98] disabled:bg-basil/15 disabled:text-basil"
                >
                  {next.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-semibold text-ink-soft" aria-live="polite">
          <ChefHat aria-hidden className="size-4" />
          {ready === 0 ? "Coba tekan tombolnya." : `${ready} pesanan siap diantar.`}
        </p>
      </div>
    </PhoneFrame>
  );
}
