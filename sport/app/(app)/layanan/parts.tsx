"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { TicketRow } from "@/server/support";

export const CATEGORY = { question: "Pertanyaan", complaint: "Keluhan", feedback: "Masukan", other: "Lainnya" } as const;
export const T_STATUS = { open: "Menunggu balasan", answered: "Sudah dibalas", closed: "Selesai" } as const;
const TONE = { open: "bg-sun/40", answered: "bg-turf-soft text-pitch", closed: "bg-mist text-ink-soft" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Percakapan satu tiket; dipakai staf dan orang tua. `mine` = pesan dari sisi pengguna ini. */
export function Thread({ t, mineIsStaff }: { t: TicketRow; mineIsStaff: boolean }) {
  return (
    <ul className="grid gap-2">
      {t.messages.map((m) => {
        const mine = m.fromStaff === mineIsStaff;
        return (
          <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2 ${mine ? "justify-self-end bg-pitch text-white" : "justify-self-start bg-mist"}`}>
            <p className="text-sm break-words whitespace-pre-line">{m.body}</p>
            <p className={`mt-1 text-[11px] ${mine ? "text-white/70" : "text-ink-soft"}`}>
              {m.fromStaff ? (m.author ?? "Akademi") : "Orang tua"} · {when(m.createdAt)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function TicketList({ tickets }: { tickets: TicketRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(tickets.find((t) => t.status === "open")?.id ?? null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function send(id: string, body: Record<string, unknown>, el?: HTMLFormElement) {
    setBusy(true);
    const r = await api(`/tickets/${id}`, { body });
    setBusy(false);
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setError(undefined);
    el?.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {tickets.map((t) => (
        <article key={t.id} className="rise rounded-[1.5rem] bg-chalk p-4 sm:p-5">
          <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id} className="flex w-full flex-wrap items-center gap-2 text-left">
            <span className="min-w-0 flex-1 basis-48">
              <span className="block font-extrabold break-words">{t.subject}</span>
              <span className="block text-sm text-ink-soft">{CATEGORY[t.category]} · {t.playerName} · {when(t.updatedAt)}</span>
            </span>
            {t.rating ? <span className="text-sm font-bold">Nilai {t.rating}/5</span> : null}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[t.status]}`}>{T_STATUS[t.status]}</span>
          </button>
          {open === t.id ? (
            <div className="mt-4 grid gap-3">
              <Thread t={t} mineIsStaff />
              <Link href={`/pemain/${t.playerId}`} className="text-sm font-bold underline decoration-pitch decoration-2 underline-offset-4">Buka data {t.playerName}</Link>
              {t.status !== "closed" ? (
                <form
                  className="grid gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const el = e.currentTarget;
                    send(t.id, { action: "reply", body: new FormData(el).get("body") }, el);
                  }}
                >
                  <textarea name="body" rows={3} maxLength={2000} placeholder="Tulis balasan" aria-label="Balasan" className="w-full min-w-0 rounded-xl border-2 border-line bg-white p-3 outline-none focus:border-pitch" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={busy}>Kirim balasan</Button>
                    <Button variant="ghost" disabled={busy} onClick={() => confirm("Tandai selesai?") && send(t.id, { action: "close" })}>Tandai selesai</Button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
