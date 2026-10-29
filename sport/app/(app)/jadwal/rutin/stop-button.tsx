"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

/** Hentikan jadwal rutin, dengan konfirmasi di tempat. */
export function StopButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function stop() {
    setBusy(true);
    const r = await api<void>(`/schedules/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  if (error) return <span className="text-sm font-semibold text-[#b42318]">{error}</span>;
  return confirm ? (
    <span className="flex gap-1">
      <Button size="sm" variant="danger" disabled={busy} onClick={stop} aria-label={`Ya, hentikan ${label}`}>
        {busy ? "…" : "Ya, hentikan"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
        Batal
      </Button>
    </span>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} aria-label={`Hentikan ${label}`}>
      Hentikan
    </Button>
  );
}
