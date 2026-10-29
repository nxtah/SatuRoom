"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { TeamFee } from "@/server/fees";

/** Tarif iuran per tim; disimpan per baris. */
export function FeeSettings({ fees, canManage }: { fees: TeamFee[]; canManage: boolean }) {
  const router = useRouter();
  const [saving, setSaving] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [error, setError] = useState<{ id: string; message: string }>();

  async function save(teamId: string, amount: FormDataEntryValue | null) {
    setSaving(teamId);
    setError(undefined);
    const r = await api<void>("/fees", { method: "PUT", body: { teamId, amount } });
    setSaving(undefined);
    if (!r.ok) return setError({ id: teamId, message: r.error.fields?.amount ?? r.error.message });
    setSaved(teamId);
    router.refresh();
  }

  if (fees.length === 0) return <p className="text-ink-soft">Belum ada tim.</p>;
  return (
    <ul className="grid gap-2">
      {fees.map((f) => (
        <li key={f.teamId} className="rounded-2xl bg-mist p-3">
          {canManage ? (
            <form
              className="flex flex-wrap items-center gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                save(f.teamId, new FormData(e.currentTarget).get("amount"));
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{f.teamName}</span>
                <span className="block text-sm text-ink-soft">{f.playerCount} pemain aktif</span>
              </span>
              <label className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink-soft">Rp</span>
                <input
                  name="amount"
                  inputMode="numeric"
                  aria-label={`Iuran per bulan ${f.teamName}`}
                  defaultValue={f.amount ?? ""}
                  placeholder="0"
                  onChange={() => setSaved(undefined)}
                  className="h-11 w-32 rounded-xl border-2 border-line bg-chalk px-3 text-right font-bold outline-none focus:border-pitch"
                />
              </label>
              <Button size="sm" type="submit" variant="dark" disabled={saving === f.teamId}>
                {saving === f.teamId ? "…" : saved === f.teamId ? "Tersimpan" : "Simpan"}
              </Button>
              {error?.id === f.teamId ? <p className="w-full text-sm font-semibold text-[#b42318]">{error.message}</p> : null}
            </form>
          ) : (
            <div className="flex justify-between gap-3">
              <span className="font-bold">{f.teamName}</span>
              <span className="font-bold">{f.amount === null ? "Belum diatur" : rupiah(f.amount)}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
