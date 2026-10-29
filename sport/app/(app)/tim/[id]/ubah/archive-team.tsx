"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

/** Arsip butuh konfirmasi kedua. Pemain tidak ikut terhapus; riwayat tetap tersimpan. */
export function ArchiveTeam({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function archive() {
    setBusy(true);
    const r = await api<void>(`/teams/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.push("/tim");
    router.refresh();
  }

  return (
    <section className="mt-5 rounded-[2rem] border-2 border-dashed border-line p-6 sm:p-8" aria-labelledby="arsip">
      <h2 id="arsip" className="font-extrabold">
        Arsipkan tim
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Tim hilang dari daftar. Pemainnya tetap ada di menu Pemain, dan riwayatnya tetap tersimpan.
      </p>
      {error ? (
        <div className="mt-4">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {confirm ? (
          <>
            <Button variant="danger" disabled={busy} onClick={archive}>
              {busy ? "Mengarsipkan…" : `Ya, arsipkan ${name}`}
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Batal
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setConfirm(true)}>
            Arsipkan tim
          </Button>
        )}
      </div>
    </section>
  );
}
