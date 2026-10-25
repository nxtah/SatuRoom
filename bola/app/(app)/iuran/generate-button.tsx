"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function GenerateButton({ month, label }: { month: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function run() {
    setBusy(true);
    const r = await api<{ created: number }>("/invoices/generate", { body: { month } });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }
  return (
    <>
      <Button onClick={run} disabled={busy}>
        {busy ? "Membuat…" : label}
      </Button>
      {error ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{error}</p> : null}
    </>
  );
}
