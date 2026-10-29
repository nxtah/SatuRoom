"use client";
import { useState } from "react";

export function AcceptButton({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    setBusy(true); setError("");
    const res = await fetch("/api/v1/me/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ invitationId: id }) });
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat bergabung."); return setBusy(false); }
    location.replace("/");
  }
  return <div className="mt-5">
    {error ? <p role="alert" className="mb-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
    <button onClick={accept} disabled={busy} className="h-12 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-50">{busy ? "Menghubungkan…" : `Gabung ke ${name}`}</button>
  </div>;
}
