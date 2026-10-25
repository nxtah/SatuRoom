"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export function AcceptButton({
  id,
  academyName,
  kind = "staff",
}: {
  id: string;
  academyName: string;
  kind?: "staff" | "guardian";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function accept() {
    setBusy(true);
    const path = kind === "guardian" ? "/me/guardian-invitations/accept" : "/me/invitations/accept";
    const r = await api(path, { body: { invitationId: id } });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error.message);
    }
    router.replace(kind === "guardian" ? "/wali" : "/?selamat=gabung");
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
        {busy ? "Bergabung…" : `Gabung ke ${academyName}`}
      </Button>
    </div>
  );
}
