"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { MODULES } from "@/lib/modules";
import type { ModuleState } from "@/server/modules";

const labelOf = (key: string) => MODULES.find((m) => m.key === key)?.label ?? key;

export function ModuleList({ modules }: { modules: ModuleState[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  async function toggle(m: ModuleState) {
    setBusy(m.key);
    setError(undefined);
    const r = await api("/modules", { method: "PUT", body: { module: m.key, enabled: !m.enabled } });
    setBusy(null);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  return (
    <div className="rise grid gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <p className="rounded-[1.5rem] bg-turf-soft p-4 text-sm text-ink">
        Selalu menyala: Beranda, Tim, Pemain, Jadwal, Absensi latihan, Staf, dan Pengaturan.
      </p>
      {modules.map((m) => {
        const blocked = m.enabled && !m.active;
        return (
          <div key={m.key} className="flex items-center gap-4 rounded-[1.5rem] bg-chalk p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="font-extrabold">{m.label}</p>
              <p className="text-sm text-ink-soft">{m.hint}</p>
              {m.requires.length ? (
                <p className={`mt-1 text-xs font-bold ${blocked ? "text-ember-deep" : "text-ink-soft"}`}>
                  {blocked ? "Tidak aktif karena butuh: " : "Butuh: "}
                  {m.requires.map(labelOf).join(", ")}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={m.enabled}
              aria-label={`${m.label}: ${m.enabled ? "menyala" : "mati"}`}
              disabled={busy === m.key}
              onClick={() => toggle(m)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 ${m.enabled ? (blocked ? "bg-sun" : "bg-turf") : "bg-line"}`}
            >
              <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${m.enabled ? "left-7" : "left-1"}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
