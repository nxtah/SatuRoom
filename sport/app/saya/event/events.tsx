"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { ParentEvent } from "@/server/events";

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
const MINE = { registered: "Terdaftar, belum bayar", paid: "Terdaftar dan lunas", cancelled: "Batal" } as const;

export function ParentEvents({ events }: { events: ParentEvent[] }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function act(eventId: string, method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("Batalkan pendaftaran?")) return;
    setBusy(true);
    const r = await api("/me/player/events", { method, body: { eventId } });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    setError(undefined);
    router.refresh();
  }
  if (!events.length) return <p className="rise rounded-[1.5rem] bg-chalk p-5 text-ink-soft">Belum ada event. Nanti muncul di sini dan di notifikasi.</p>;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {error ? <div className="lg:col-span-2"><Alert tone="error">{error}</Alert></div> : null}
      {events.map((e) => {
        const joined = e.mine && e.mine.status !== "cancelled";
        const full = e.capacity !== null && e.participants >= e.capacity;
        return (
          <article key={e.id} className={`rise grid gap-2 rounded-[1.5rem] bg-chalk p-5 ${e.status === "done" ? "opacity-80" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 flex-1 text-lg font-extrabold break-words">{e.title}</h2>
              {e.kind === "tournament" ? <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold">Turnamen</span> : null}
            </div>
            <p className="text-sm text-ink-soft">
              {fmt(e.startsOn)}{e.endsOn !== e.startsOn ? ` - ${fmt(e.endsOn)}` : ""}{e.place ? ` · ${e.place}` : ""} · {e.fee ? rupiah(e.fee) : "Gratis"}
            </p>
            {e.description ? <p className="text-sm whitespace-pre-line">{e.description}</p> : null}
            {joined ? (
              <p className="rounded-xl bg-turf-soft px-3 py-2 text-sm font-bold text-pitch">
                {e.fee ? MINE[e.mine!.status] : "Terdaftar"}
                {e.mine!.rank ? ` · Peringkat ${e.mine!.rank}` : ""}{e.mine!.result ? ` · ${e.mine!.result}` : ""}
              </p>
            ) : null}
            {e.standings.length ? (
              <ol className="grid gap-1 text-sm">
                {e.standings.slice(0, 6).map((s, i) => (
                  <li key={s.teamId} className="flex justify-between gap-2 border-b border-mist py-1">
                    <span>{i + 1}. {s.name}</span>
                    <span className="font-bold tabular-nums">{s.points} poin</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {e.status === "open" && e.parentSignup ? (
              joined ? (
                e.mine!.status === "registered" ? <Button size="sm" variant="ghost" className="justify-self-start" disabled={busy} onClick={() => act(e.id, "DELETE")}>Batalkan pendaftaran</Button> : null
              ) : (
                <Button className="justify-self-start" disabled={busy || full} onClick={() => act(e.id, "POST")}>{full ? "Kuota penuh" : "Daftar"}</Button>
              )
            ) : null}
            {e.status === "open" && !e.parentSignup && !joined ? <p className="text-sm text-ink-soft">Pendaftaran lewat pelatih atau admin.</p> : null}
          </article>
        );
      })}
    </div>
  );
}
