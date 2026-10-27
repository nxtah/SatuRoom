import { CalendarDays, Check } from "lucide-react";

/** Potongan layar yang melayang di sekitar ponsel hero. Data contoh, bukan data asli. */
export function HeroChips() {
  return (
    <>
      <div className="drift-a absolute top-[14%] -left-2 z-10 hidden sm:block lg:-left-10">
        <div className="bob flex items-center gap-3 rounded-2xl border border-line bg-chalk py-2.5 pr-5 pl-2.5 shadow-chip">
          <span className="grid size-9 place-items-center rounded-xl bg-turf text-white">
            <Check aria-hidden className="size-5" />
          </span>
          <span className="text-sm leading-tight font-bold">
            Raka hadir
            <span className="block text-xs font-semibold text-ink-soft">Latihan U-12</span>
          </span>
        </div>
      </div>
      <div className="drift-b absolute bottom-[18%] -right-2 z-10 hidden sm:block lg:-right-8">
        <div className="bob bob-2 flex items-center gap-3 rounded-2xl border border-line bg-chalk py-2.5 pr-5 pl-2.5 shadow-chip">
          <span className="grid size-9 place-items-center rounded-xl bg-ember text-ink">
            <CalendarDays aria-hidden className="size-5" />
          </span>
          <span className="text-sm leading-tight font-bold">
            Selasa 16.00
            <span className="block text-xs font-semibold text-ink-soft">Lapangan A</span>
          </span>
        </div>
      </div>
    </>
  );
}
