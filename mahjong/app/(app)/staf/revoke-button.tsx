"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function RevokeButton({ id, email }: { id: string; email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function revoke() {
    setBusy(true);
    const r = await api<void>(`/invitations/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }
  if (error) return <span className="text-sm font-semibold text-[#b42318]">{error}</span>;
  return (
    <Button size="sm" variant="ghost" disabled={busy} onClick={revoke} aria-label={`Batalkan undangan untuk ${email}`}>
      {busy ? "…" : "Batalkan"}
    </Button>
  );
}
