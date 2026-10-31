"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

/** Pilihan anak untuk akun orang tua yang memegang lebih dari satu anak. */
export function ChildSwitcher({ kids, current }: { kids: { playerId: string; fullName: string; academyName: string }[]; current: string }) {
  const router = useRouter();
  if (kids.length < 2) return null;
  const multiAcademy = new Set(kids.map((k) => k.academyName)).size > 1;
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm font-bold">
      <span className="hidden sm:inline">Anak</span>
      <select
        aria-label="Pilih anak"
        value={current}
        onChange={async (e) => {
          await api("/me/player/child", { method: "PUT", body: { playerId: e.target.value } });
          router.refresh();
        }}
        className="h-10 max-w-44 min-w-0 rounded-full border-2 border-line bg-chalk px-3 font-bold outline-none focus:border-pitch sm:max-w-64"
      >
        {kids.map((k) => (
          <option key={k.playerId} value={k.playerId}>
            {k.fullName}{multiAcademy ? ` · ${k.academyName}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
