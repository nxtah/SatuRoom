"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { PhoneFrame } from "./phone-frame";
import { Ruru } from "./ruru";

type Status = "hadir" | "izin" | "sakit" | "alpa";

const OPTIONS: { value: Status; label: string; on: string }[] = [
  { value: "hadir", label: "Hadir", on: "bg-turf text-white" },
  { value: "izin", label: "Izin", on: "bg-sun text-ink" },
  { value: "sakit", label: "Sakit", on: "bg-[#3b6fd8] text-white" },
  { value: "alpa", label: "Alpa", on: "bg-ember-deep text-white" },
];

// Nama fiktif untuk contoh.
const PLAYERS = ["Raka", "Bima", "Dimas", "Fajar", "Gilang"];
const START: Record<string, Status | undefined> = { Raka: "hadir", Bima: "hadir", Dimas: "izin" };

export function AttendanceDemo() {
  const [marks, setMarks] = useState(START);
  const [saved, setSaved] = useState(false);
  const done = PLAYERS.filter((p) => marks[p]).length;
  const complete = done === PLAYERS.length;

  return (
    <PhoneFrame label="Contoh layar absensi yang bisa dicoba">
      <div className="px-4 pt-11 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-ink-soft">Selasa, 16.00</p>
            <p className="font-display text-lg font-extrabold leading-tight">Latihan U-12</p>
          </div>
          <span className="rounded-full bg-chalk px-2.5 py-1 text-[11px] font-bold text-ink-soft">
            Contoh
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-turf transition-[width] duration-500"
              style={{ width: `${(done / PLAYERS.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-ink-soft" aria-live="polite">
            {done} dari {PLAYERS.length}
          </span>
        </div>

        {saved ? (
          <div className="flex flex-col items-center px-2 py-8 text-center" role="status">
            <div className="w-28">
              <Ruru pose="cheer" costume="academy" />
            </div>
            <p className="mt-3 font-display text-xl font-extrabold">Absen tersimpan</p>
            <p className="mt-1 text-sm text-ink-soft">
              Pemilik akademi langsung bisa melihatnya. Tidak perlu kirim foto kertas absen.
            </p>
            <button
              type="button"
              onClick={() => {
                setMarks(START);
                setSaved(false);
              }}
              className="mt-5 rounded-full border border-line bg-chalk px-4 py-2 text-sm font-bold transition hover:border-ink-soft"
            >
              Coba lagi
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-3 grid gap-2">
              {PLAYERS.map((name) => (
                <li key={name} className="rounded-2xl bg-chalk p-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <span
                      aria-hidden
                      className="grid size-7 place-items-center rounded-full bg-turf-soft text-xs font-bold text-pitch"
                    >
                      {name[0]}
                    </span>
                    <span className="text-sm font-bold">{name}</span>
                    {marks[name] ? (
                      <Check aria-hidden className="ml-auto size-4 text-turf" />
                    ) : null}
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={`Kehadiran ${name}`}
                    className="mt-2 grid grid-cols-4 gap-1"
                  >
                    {OPTIONS.map((o) => {
                      const on = marks[name] === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setMarks((m) => ({ ...m, [name]: o.value }))}
                          className={`rounded-full py-1.5 text-[11px] font-bold transition active:scale-95 ${
                            on ? o.on : "bg-mist text-ink-soft hover:bg-line"
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={!complete}
              onClick={() => setSaved(true)}
              className="mt-3 w-full rounded-full bg-ember py-3 text-sm font-bold text-ink transition hover:bg-[#ff7d24] active:scale-[0.98] disabled:bg-line disabled:text-ink-soft"
            >
              {complete ? "Simpan absen" : `Tandai ${PLAYERS.length - done} pemain lagi`}
            </button>
          </>
        )}
      </div>
    </PhoneFrame>
  );
}
