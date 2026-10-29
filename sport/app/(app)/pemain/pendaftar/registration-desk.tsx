"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ageOf } from "@/lib/age";
import type { RegistrationLink, RegistrationRow } from "@/server/registrations";

interface Props {
  origin: string;
  link: RegistrationLink | null;
  pending: RegistrationRow[];
  teams: { id: string; name: string }[];
  academyName: string;
}

/** Nomor lokal 08xx ke format internasional untuk tautan WhatsApp. */
const waNumber = (phone: string) => {
  const digits = phone.replace(/[^0-9]/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
};

export function RegistrationDesk({ origin, link, pending, teams, academyName }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>(teams.length === 1 ? [teams[0]!.id] : []);

  const url = link ? `${origin}/daftar-pemain/${link.token}` : "";

  async function run(job: () => Promise<{ ok: true } | { ok: false; error: { message: string } }>) {
    setBusy(true);
    setError("");
    const res = await job();
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }

  const updateLink = (body: { enabled?: boolean; rotate?: boolean }) => run(() => api("/registration-link", { method: "PUT", body }));

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Link belum bisa disalin. Pilih dan salin manual dari kotak di atas.");
    }
  }

  const shareText = `Daftar jadi pemain ${academyName} lewat link ini: ${url}`;

  return (
    <div className="grid gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="rise rounded-[2rem] bg-pitch p-5 text-white sm:p-7" aria-labelledby="link-judul">
        <h2 id="link-judul" className="text-lg font-extrabold">Link pendaftaran</h2>
        {link ? (
          <>
            <p className="mt-1 text-sm text-white/70">
              {link.enabled
                ? "Siapa pun yang punya link ini bisa mendaftar. Pendaftar baru masuk ke daftar tunggu di bawah."
                : "Link sedang dimatikan. Orang yang membukanya melihat pendaftaran ditutup."}
            </p>
            <input
              readOnly value={url} aria-label="Link pendaftaran" onFocus={(e) => e.currentTarget.select()}
              className={`mt-4 h-12 w-full rounded-2xl bg-white/10 px-4 text-sm outline-none ${link.enabled ? "" : "opacity-50"}`}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={copy} disabled={!link.enabled}>
                {copied ? <Check aria-hidden className="size-5" /> : <Copy aria-hidden className="size-5" />}
                {copied ? "Tersalin" : "Salin link"}
              </Button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"
                aria-disabled={!link.enabled}
                className={`inline-flex h-12 items-center rounded-full bg-turf px-6 text-[15px] font-bold text-white transition hover:bg-turf/80 ${link.enabled ? "" : "pointer-events-none opacity-50"}`}
              >
                Bagikan ke WhatsApp
              </a>
              <Button variant="outline" disabled={busy} onClick={() => updateLink({ enabled: !link.enabled })}>
                {link.enabled ? "Matikan link" : "Nyalakan lagi"}
              </Button>
              <Button
                variant="ghost" disabled={busy} className="text-white hover:bg-white/10"
                onClick={() => { if (window.confirm("Link lama akan berhenti berfungsi. Lanjutkan?")) void updateLink({ rotate: true }); }}
              >
                Buat link baru
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/70">
              Buat satu link untuk dibagikan di grup WhatsApp atau media sosial. Calon pemain mengisi nama, tanggal lahir, dan kontak orang tua.
            </p>
            <div className="mt-4">
              <Button disabled={busy} onClick={() => updateLink({})}>
                <Link2 aria-hidden className="size-5" /> Buat link pendaftaran
              </Button>
            </div>
          </>
        )}
      </section>

      {pending.length === 0 ? (
        <EmptyState title="Belum ada pendaftar baru">
          {link ? "Begitu ada yang mendaftar, namanya muncul di sini untuk Anda terima atau tolak." : "Buat link dulu, lalu bagikan ke calon pemain."}
        </EmptyState>
      ) : (
        <section aria-labelledby="menunggu" className="rise grid gap-3">
          <h2 id="menunggu" className="px-1 text-lg font-extrabold">Menunggu keputusan ({pending.length})</h2>
          <ul className="grid gap-3">
            {pending.map((r) => (
              <li key={r.id} className="rounded-[2rem] bg-chalk p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-extrabold">{r.fullName}</p>
                    <p className="text-sm text-ink-soft">{ageOf(r.birthDate)} tahun, lahir {r.birthDate}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm">
                  Wali: <b>{r.guardianName}</b>,{" "}
                  <a className="font-bold underline decoration-pitch decoration-2 underline-offset-4" href={`https://wa.me/${waNumber(r.guardianPhone)}`} target="_blank" rel="noopener noreferrer">
                    {r.guardianPhone}
                  </a>
                </p>
                {r.note ? <p className="mt-2 rounded-2xl bg-mist p-3 text-sm break-words">{r.note}</p> : null}

                {open === r.id ? (
                  <div className="mt-4 grid gap-3 rounded-2xl border-2 border-line p-4">
                    <fieldset>
                      <legend className="mb-2 text-sm font-bold">Masuk ke tim</legend>
                      {teams.length === 0 ? (
                        <p className="text-sm text-ink-soft">Belum ada tim. Buat tim dulu di menu Tim.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {teams.map((t) => (
                            <label key={t.id} className="cursor-pointer">
                              <input
                                type="checkbox" className="peer sr-only" checked={picked.includes(t.id)}
                                onChange={(e) => setPicked((p) => (e.target.checked ? [...p, t.id] : p.filter((x) => x !== t.id)))}
                              />
                              <span className="flex h-11 items-center gap-2 rounded-full border-2 border-line bg-chalk px-4 font-bold transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember">
                                {t.name}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </fieldset>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={busy || picked.length === 0}
                        onClick={() => run(() => api(`/registrations/${r.id}/approve`, { body: { teamIds: picked } }))}
                      >
                        Terima jadi pemain
                      </Button>
                      <Button variant="ghost" onClick={() => setOpen(null)}>Batal</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setOpen(r.id)}>Terima</Button>
                    <Button
                      size="sm" variant="outline" disabled={busy}
                      onClick={() => { if (window.confirm(`Tolak pendaftaran ${r.fullName}?`)) void run(() => api(`/registrations/${r.id}/reject`, { body: {} })); }}
                    >
                      Tolak
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
