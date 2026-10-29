"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { TIER_LABEL, type Tier } from "@/lib/billing";

export interface PickedMember {
  id: string;
  fullName: string;
  tier: Tier;
  balance: number;
}

/** Cari member dari nama atau nomor HP. Kosong berarti tamu. */
export function MemberPicker({ value, onChange }: { value: PickedMember | null; onChange: (m: PickedMember | null) => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<PickedMember[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(async () => {
      const r = await api<{ members: PickedMember[] }>(`/members?q=${encodeURIComponent(q.trim())}`);
      setRows(r.ok ? r.data.members : []);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  if (value)
    return (
      <div className="flex items-center gap-3 rounded-xl border-2 border-pitch bg-turf-soft px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{value.fullName}</p>
          <p className="text-sm text-ink-soft">{TIER_LABEL[value.tier]}</p>
        </div>
        <button type="button" aria-label="Lepas member" onClick={() => onChange(null)} className="grid size-9 place-items-center rounded-lg hover:bg-chalk">
          <X aria-hidden className="size-4" />
        </button>
      </div>
    );

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Cari member</span>
        <Search aria-hidden className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-soft" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length < 2) setRows([]);
          }}
          placeholder="Cari member (nama atau HP), kosongkan untuk tamu"
          className="h-12 w-full rounded-xl border-2 border-line bg-chalk pr-4 pl-10 outline-none focus:border-pitch"
        />
      </label>
      {rows.length ? (
        <ul className="mt-2 grid gap-1 rounded-xl border border-line bg-chalk p-1">
          {rows.slice(0, 5).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(m);
                  setQ("");
                  setRows([]);
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-mist"
              >
                <span className="font-semibold">{m.fullName}</span>
                <span className="text-xs font-bold text-ink-soft">{TIER_LABEL[m.tier]}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
