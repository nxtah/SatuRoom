"use client";

import { Check } from "lucide-react";
import { SPORTS, type SportId } from "@/lib/sports";
import { SportIcon } from "./sport-icons";

/** Pilih cabang olahraga. Radio sungguhan (bisa dipakai keyboard) yang dibungkus kartu. */
export function SportPicker({ defaultValue = "football", value, onChange, disabled = false, error }: { defaultValue?: SportId; value?: SportId; onChange?: (id: SportId) => void; disabled?: boolean; error?: string }) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      {/* Fieldset nonaktif tidak ikut terkirim, jadi nilai terkunci dikirim lewat input tersembunyi. */}
      {disabled ? <input type="hidden" name="sport" value={value ?? defaultValue} /> : null}
      <legend className="mb-3 text-sm font-bold">Cabang olahraga</legend>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {SPORTS.map((s) => (
          <label key={s.id} className="cursor-pointer has-disabled:cursor-not-allowed has-disabled:opacity-60">
            <input type="radio" name={disabled ? undefined : "sport"} value={s.id} {...(value ? { checked: value === s.id } : { defaultChecked: defaultValue === s.id })} onChange={() => onChange?.(s.id)} className="peer sr-only" />
            <span className="relative flex h-full flex-col items-start gap-2 rounded-[1.25rem] border-2 border-line bg-chalk p-3.5 transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pitch-2 hover:border-pitch-2 sm:p-4">
              <span className="grid size-11 place-items-center rounded-2xl bg-mist text-pitch transition [:checked~span_&]:bg-ember">
                <SportIcon sport={s.id} className="size-7" />
              </span>
              <span className="text-[15px] leading-tight font-extrabold">{s.label}</span>
              <Check aria-hidden className="absolute top-3 right-3 size-4 text-ember opacity-0 transition [:checked~span_&]:opacity-100" />
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{error}</p> : null}
    </fieldset>
  );
}
