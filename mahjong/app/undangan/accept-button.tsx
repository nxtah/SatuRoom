"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function AcceptButton({ id, venueName }: { id: string; venueName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function accept() {
    setBusy(true);
    const r = await api("/me/invitations/accept", { body: { invitationId: id } });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error.message);
    }
    router.replace("/?selamat=gabung");
    router.refresh();
  }

  return (
    <div className="mt-5">
      {error ? (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      <Button onClick={accept} disabled={busy}>
        {busy ? "Menghubungkan…" : `Gabung ke ${venueName}`}
      </Button>
    </div>
  );
}
