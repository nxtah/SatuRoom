"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";

/** Batalkan atau pulihkan sesi. Pembatalan butuh konfirmasi; alasan opsional. */
export function SessionActions({ id, cancelled }: { id: string; cancelled: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(path: string, body?: unknown) {
    setBusy(true);
    const r = await api<void>(`/sessions/${id}/${path}`, { method: "POST", body });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-[2rem] border-2 border-dashed border-line p-6" aria-label="Kelola sesi">
      {error ? (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      {cancelled ? (
        <Button variant="dark" disabled={busy} onClick={() => run("restore")}>
          {busy ? "Memulihkan…" : "Batalkan pembatalan"}
        </Button>
      ) : open ? (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run("cancel", { reason: new FormData(e.currentTarget).get("reason") });
          }}
        >
          <Field label="Alasan (boleh kosong)" name="reason" placeholder="Contoh: lapangan dipakai acara" maxLength={200} autoFocus />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={busy}>
              {busy ? "Membatalkan…" : "Ya, batalkan sesi"}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Kembali
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm text-ink-soft">Latihan tidak jadi? Batalkan agar pelatih dan admin tahu.</p>
          <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>
            Batalkan sesi ini
          </Button>
        </>
      )}
    </section>
  );
}
