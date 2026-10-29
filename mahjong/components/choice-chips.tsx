import { Check } from "lucide-react";

interface Option {
  value: string | number;
  label: string;
}

/** Pilihan berbentuk pil (radio atau checkbox) yang mudah diketuk di HP. */
export function ChoiceChips({
  legend,
  name,
  options,
  multiple,
  defaultValue,
  error,
}: {
  legend: string;
  name: string;
  options: readonly Option[];
  multiple?: boolean;
  defaultValue?: readonly (string | number)[];
  error?: string;
}) {
  const selected = new Set((defaultValue ?? []).map(String));
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.value}
              defaultChecked={selected.has(String(o.value))}
              className="peer sr-only"
            />
            <span className="flex h-11 items-center gap-1.5 rounded-xl border-2 border-line bg-chalk px-4 font-bold transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pitch hover:border-ink-soft/30 [&>svg]:hidden peer-checked:[&>svg]:block">
              <Check aria-hidden className="size-4" />
              {o.label}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{error}</p> : null}
    </fieldset>
  );
}
