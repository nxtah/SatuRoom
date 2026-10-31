"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { ScholarshipRow } from "@/server/accounting";

const input = "h-11 w-full min-w-0 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch";

/** Beasiswa/potongan rutin: otomatis jadi potongan saat tagihan bulanan dibuat. */
export function Scholarships({ items, players, canManage, today }: { items: ScholarshipRow[]; players: { id: string; name: string }[]; canManage: boolean; today: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [kind, setKind] = useState<"percent" | "amount">("percent");

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const f = new FormData(el);
    const r = await api("/scholarships", {
      body: { playerId: f.get("playerId"), kind, value: String(f.get("value")).replace(/[^0-9]/g, ""), reason: f.get("reason"), startsOn: f.get("startsOn"), endsOn: f.get("endsOn") },
    });
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setError(undefined);
    el.reset();
    router.refresh();
  }
  async function end(id: string) {
    if (!confirm("Hentikan beasiswa ini? Tagihan yang sudah dibuat tidak berubah.")) return;
    const r = await api(`/scholarships/${id}`, { method: "DELETE" });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {items.length ? (
        <ul className="grid gap-2">
          {items.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-mist p-3">
              <div className="min-w-0 flex-1 basis-48">
                <p className="font-bold">{s.fullName}</p>
                <p className="text-sm text-ink-soft">
                  {s.kind === "percent" ? `${s.value}%` : rupiah(s.value)} · {s.reason}
                  {s.endsOn ? ` · sampai ${s.endsOn}` : " · tanpa batas"}
                  {s.active ? "" : " · selesai"}
                </p>
              </div>
              {canManage ? <Button size="sm" variant="ghost" onClick={() => end(s.id)}>Hentikan</Button> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">Belum ada beasiswa.</p>
      )}
      {canManage ? (
        <form onSubmit={add} className="grid gap-3 rounded-2xl bg-mist p-4">
          <label className="grid gap-1 text-sm font-bold">
            Pemain
            <select name="playerId" className={input} defaultValue="">
              <option value="" disabled>Pilih pemain</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 text-sm font-bold">
              Bentuk
              <div className="flex gap-2">
                {(["percent", "amount"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`h-11 flex-1 rounded-xl border-2 font-bold ${kind === k ? "border-pitch bg-pitch text-white" : "border-line bg-white"}`}>
                    {k === "percent" ? "Persen" : "Rupiah"}
                  </button>
                ))}
              </div>
            </div>
            <label className="grid gap-1 text-sm font-bold">
              {kind === "percent" ? "Besar potongan (%)" : "Potongan per bulan (Rp)"}
              <input name="value" inputMode="numeric" placeholder={kind === "percent" ? "50" : "100000"} className={input} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-bold">
            Alasan
            <input name="reason" placeholder="Prestasi, kakak beradik, kurang mampu" className={input} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-bold">Mulai<input type="date" name="startsOn" defaultValue={today} className={input} /></label>
            <label className="grid gap-1 text-sm font-bold">Sampai (boleh kosong)<input type="date" name="endsOn" className={input} /></label>
          </div>
          <Button type="submit" className="justify-self-start">Simpan beasiswa</Button>
        </form>
      ) : null}
    </div>
  );
}
