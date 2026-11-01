"use client";

import { NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

/** Topik dan rencana latihan. Pelatih mengisi; admin dan pemilik memantau. */
export function PlanPanel({ sessionId, topic, plan, canEdit }: { sessionId: string; topic: string | null; plan: string | null; canEdit: boolean }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  if (!canEdit && !topic && !plan) return null;
  return (
    <section className="rise mb-5 rounded-[2rem] bg-chalk p-5 sm:p-6" aria-labelledby="rencana">
      <div className="flex items-center gap-2">
        <NotebookPen aria-hidden className="size-5 text-turf" />
        <h2 id="rencana" className="flex-1 text-lg font-extrabold">Rencana latihan</h2>
        {canEdit && !edit ? <Button size="sm" variant="ghost" onClick={() => setEdit(true)}>{topic || plan ? "Ubah" : "Isi rencana"}</Button> : null}
      </div>
      {edit ? (
        <form
          className="mt-3 grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            const r = await api(`/sessions/${sessionId}/plan`, { method: "PUT", body: { topic: f.get("topic"), plan: f.get("plan") } });
            setBusy(false);
            if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
            setEdit(false);
            router.refresh();
          }}
        >
          {error ? <Alert tone="error">{error}</Alert> : null}
          <label className="grid gap-1 text-sm font-bold">
            Topik
            <input name="topic" defaultValue={topic ?? ""} maxLength={120} placeholder="Contoh: Passing pendek dan kontrol bola" className="h-11 w-full min-w-0 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch" />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Rencana (pemanasan, latihan inti, permainan, pendinginan)
            <textarea name="plan" defaultValue={plan ?? ""} rows={6} maxLength={3000} placeholder={"Pemanasan 10 menit\nRondo 4v1 15 menit\nGame 7v7 30 menit\nPendinginan 5 menit"} className="w-full min-w-0 rounded-xl border-2 border-line bg-white p-3 outline-none focus:border-pitch" />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Simpan</Button>
            <Button variant="ghost" onClick={() => setEdit(false)}>Batal</Button>
          </div>
        </form>
      ) : (
        <div className="mt-2">
          {topic ? <p className="font-bold">{topic}</p> : null}
          {plan ? <p className="mt-1 whitespace-pre-line text-ink-soft">{plan}</p> : null}
          {!topic && !plan ? <p className="text-sm text-ink-soft">Belum ada rencana. Isi topik supaya pemain dan admin tahu fokus latihan hari ini.</p> : null}
        </div>
      )}
    </section>
  );
}
