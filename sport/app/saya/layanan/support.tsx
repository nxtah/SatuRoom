"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { TicketRow } from "@/server/support";
import { CATEGORY, T_STATUS, Thread } from "../../(app)/layanan/parts";

const cell = "h-11 w-full min-w-0 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch";

export function ParentSupport({ tickets }: { tickets: TicketRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(tickets.find((t) => t.status === "answered")?.id ?? null);

  async function call(method: "POST" | "PUT", body: Record<string, unknown>, el?: HTMLFormElement) {
    setBusy(true);
    const r = await api("/me/player/tickets", { method, body });
    setBusy(false);
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setError(undefined);
    el?.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
      <form
        className="rise grid gap-3 rounded-[2rem] bg-chalk p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const el = e.currentTarget;
          const f = new FormData(el);
          call("POST", { category: f.get("category"), subject: f.get("subject"), body: f.get("body") }, el);
        }}
      >
        <h2 className="text-lg font-extrabold">Kirim pesan baru</h2>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CATEGORY).map(([k, v]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-white px-3 py-2 text-sm font-bold has-[:checked]:border-pitch has-[:checked]:bg-turf-soft">
              <input type="radio" name="category" value={k} defaultChecked={k === "question"} className="accent-pitch" /> {v}
            </label>
          ))}
        </div>
        <label className="grid gap-1 text-sm font-bold">Judul<input name="subject" maxLength={120} placeholder="Contoh: Jadwal libur lebaran" className={cell} /></label>
        <label className="grid gap-1 text-sm font-bold">
          Pesan
          <textarea name="body" rows={4} maxLength={2000} className="w-full min-w-0 rounded-xl border-2 border-line bg-white p-3 outline-none focus:border-pitch" />
        </label>
        <Button type="submit" className="justify-self-start" disabled={busy}>Kirim</Button>
      </form>
      <section className="grid gap-3">
        <h2 className="text-lg font-extrabold">Pesan saya</h2>
        {tickets.length === 0 ? <p className="text-sm text-ink-soft">Belum ada pesan.</p> : null}
        {tickets.map((t) => (
          <article key={t.id} className="rise rounded-[1.5rem] bg-chalk p-4">
            <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id} className="flex w-full flex-wrap items-center gap-2 text-left">
              <span className="min-w-0 flex-1 font-extrabold break-words">{t.subject}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t.status === "answered" ? "bg-turf-soft text-pitch" : "bg-mist"}`}>{T_STATUS[t.status]}</span>
            </button>
            {open === t.id ? (
              <div className="mt-3 grid gap-3">
                <Thread t={t} mineIsStaff={false} />
                {t.status !== "closed" ? (
                  <>
                    <form
                      className="grid gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const el = e.currentTarget;
                        call("PUT", { ticketId: t.id, action: "reply", body: new FormData(el).get("body") }, el);
                      }}
                    >
                      <textarea name="body" rows={2} maxLength={2000} placeholder="Balas" aria-label="Balasan" className="w-full min-w-0 rounded-xl border-2 border-line bg-white p-3 outline-none focus:border-pitch" />
                      <Button type="submit" size="sm" className="justify-self-start" disabled={busy}>Kirim balasan</Button>
                    </form>
                    {t.status === "answered" ? (
                      <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-mist p-3">
                        <span className="mr-1 text-sm font-bold">Sudah terjawab? Beri nilai:</span>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Button key={n} size="sm" variant="outline" disabled={busy} aria-label={`Nilai ${n}`} onClick={() => call("PUT", { ticketId: t.id, action: "close", rating: n })}>
                            {n}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : t.rating ? (
                  <p className="text-sm text-ink-soft">Anda memberi nilai {t.rating} dari 5. Terima kasih.</p>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
