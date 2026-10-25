"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

/** Pemain tidak dihapus permanen: dinonaktifkan agar riwayat absensi tetap utuh. */
export function StatusToggle({ id, status }: { id: string; status: "active" | "inactive" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const active = status === "active";

  async function toggle() {
    setBusy(true);
    const r = await api<void>(`/players/${id}/status`, { body: { status: active ? "inactive" : "active" } });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  return (
    <section className="mt-4 rounded-[2rem] border-2 border-dashed border-line p-6">
      <p className="text-sm text-ink-soft">
        {active
          ? "Pemain keluar atau berhenti latihan? Nonaktifkan. Datanya tetap tersimpan dan bisa diaktifkan lagi."
          : "Pemain ini tidak muncul di daftar dan absensi."}
      </p>
      {error ? (
        <div className="mt-3">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      <Button variant={active ? "outline" : "dark"} disabled={busy} onClick={toggle} className="mt-4">
        {busy ? "Menyimpan…" : active ? "Nonaktifkan pemain" : "Aktifkan lagi"}
      </Button>
    </section>
  );
}
