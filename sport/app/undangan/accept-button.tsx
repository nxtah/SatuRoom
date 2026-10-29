"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";

type Props =
  | { id: string; academyName: string; kind?: "staff" }
  | { id: string; academyName: string; kind: "player"; minor: boolean; playerName: string };

export function AcceptButton(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [agreed, setAgreed] = useState(false);
  const [guardian, setGuardian] = useState("");
  const player = props.kind === "player" ? props : null;

  async function accept() {
    setBusy(true);
    const r = player
      ? await api("/me/player-invitations/accept", {
          body: { invitationId: props.id, consentBy: player.minor ? guardian : player.playerName },
        })
      : await api("/me/invitations/accept", { body: { invitationId: props.id } });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error.fields?.consentBy ?? r.error.message);
    }
    router.replace(player ? "/saya" : "/?selamat=gabung");
    router.refresh();
  }

  const ready = !player || (agreed && (!player.minor || guardian.trim().length >= 2));

  return (
    <div className="mt-5">
      {player ? (
        <div className="mb-4 grid gap-3 rounded-2xl bg-mist p-4">
          {player.minor ? (
            <Field
              label="Nama orang tua/wali"
              hint={`${player.playerName} di bawah 18 tahun, jadi akun ini perlu persetujuan orang tua/wali.`}
              value={guardian}
              onChange={(e) => setGuardian(e.target.value)}
              autoComplete="name"
            />
          ) : null}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-5 shrink-0 accent-[#1f8a5b]"
            />
            <span>
              {player.minor
                ? `Saya orang tua/wali ${player.playerName}, atau sudah mendapat izin mereka, dan setuju data latihan, kehadiran, dan iuran ditampilkan di akun ini.`
                : `Saya ${player.playerName} dan setuju data latihan, kehadiran, dan iuran saya ditampilkan di akun ini.`}
            </span>
          </label>
        </div>
      ) : null}
      {error ? (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      <Button onClick={accept} disabled={busy || !ready}>
        {busy ? "Menghubungkan…" : player ? "Hubungkan akun pemain" : `Gabung ke ${props.academyName}`}
      </Button>
    </div>
  );
}
