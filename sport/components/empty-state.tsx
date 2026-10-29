import type { ReactNode } from "react";
import { Maskot } from "./maskot";

/** Halaman kosong: Maskot menunjukkan langkah berikutnya, bukan sekadar "tidak ada data". */
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rise flex flex-col items-center rounded-[2rem] bg-chalk px-6 py-10 text-center sm:py-14">
      <div className="w-28">
        <Maskot />
      </div>
      <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
      <div className="mt-2 max-w-sm text-ink-soft">{children}</div>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
