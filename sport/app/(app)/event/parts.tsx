"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { EventRow } from "@/server/events";

export const STATUS_LABEL = { draft: "Draf", open: "Pendaftaran dibuka", closed: "Pendaftaran ditutup", done: "Selesai", cancelled: "Dibatalkan" } as const;
export const STATUS_TONE = { draft: "bg-mist", open: "bg-turf-soft text-pitch", closed: "bg-sun/40", done: "bg-mist text-ink-soft", cancelled: "bg-flame/15 text-flame" } as const;
export const cell = "h-11 w-full min-w-0 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch";

/** Form membuat atau mengubah event. */
export function EventForm({ today, event, onDone }: { today: string; event?: EventRow; onDone?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="rise grid gap-3 rounded-[2rem] bg-chalk p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const el = e.currentTarget;
        const f = new FormData(el);
        setBusy(true);
        const payload = {
          kind: f.get("kind"), title: f.get("title"), description: f.get("description"), place: f.get("place"),
          startsOn: f.get("startsOn"), endsOn: f.get("endsOn") || f.get("startsOn"),
          fee: String(f.get("fee") ?? "").replace(/[^0-9]/g, "") || "0", capacity: String(f.get("capacity") ?? "").replace(/[^0-9]/g, ""),
          parentSignup: f.get("parentSignup") === "on",
        };
        const r = event ? await api(`/events/${event.id}`, { method: "PUT", body: payload }) : await api<{ id: string }>("/events", { body: payload });
        setBusy(false);
        if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
        if (event) {
          onDone?.();
          router.refresh();
        } else router.push(`/event/${(r.data as { id: string }).id}`);
      }}
    >
      <h2 className="text-lg font-extrabold">{event ? "Ubah event" : "Buat event"}</h2>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid grid-cols-2 gap-2">
        {(["event", "tournament"] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-white px-3 py-2 font-bold has-[:checked]:border-pitch has-[:checked]:bg-turf-soft">
            <input type="radio" name="kind" value={k} defaultChecked={(event?.kind ?? "event") === k} className="accent-pitch" />
            {k === "event" ? "Event" : "Turnamen"}
          </label>
        ))}
      </div>
      <label className="grid gap-1 text-sm font-bold">Nama<input name="title" defaultValue={event?.title} placeholder="Coaching clinic liburan" className={cell} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-bold">Mulai<input type="date" name="startsOn" defaultValue={event?.startsOn ?? today} className={cell} /></label>
        <label className="grid gap-1 text-sm font-bold">Selesai<input type="date" name="endsOn" defaultValue={event?.endsOn} className={cell} /></label>
      </div>
      <label className="grid gap-1 text-sm font-bold">Tempat (boleh kosong)<input name="place" defaultValue={event?.place ?? ""} className={cell} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-bold">Biaya (Rp, 0 = gratis)<input name="fee" inputMode="numeric" defaultValue={event?.fee || ""} placeholder="0" className={cell} /></label>
        <label className="grid gap-1 text-sm font-bold">Kuota (boleh kosong)<input name="capacity" inputMode="numeric" defaultValue={event?.capacity ?? ""} className={cell} /></label>
      </div>
      <label className="grid gap-1 text-sm font-bold">
        Keterangan (boleh kosong)
        <textarea name="description" rows={3} defaultValue={event?.description ?? ""} maxLength={1500} className="w-full min-w-0 rounded-xl border-2 border-line bg-white p-3 outline-none focus:border-pitch" />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" name="parentSignup" defaultChecked={event?.parentSignup ?? true} className="size-5 accent-pitch" /> Orang tua boleh mendaftar sendiri dari akun pemain
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{event ? "Simpan" : "Buat event"}</Button>
        {event ? <Button variant="ghost" onClick={onDone}>Batal</Button> : null}
      </div>
    </form>
  );
}
