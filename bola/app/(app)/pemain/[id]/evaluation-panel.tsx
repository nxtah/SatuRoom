"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RatingDots } from "@/components/rating-dots";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dayLabel } from "@/lib/dates";
import { EVALUATION_ASPECTS, EvaluationInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";
import type { EvaluationRow } from "@/server/evaluations";

type Draft = Pick<EvaluationRow, "period" | "technique" | "tactics" | "fitness" | "attitude" | "strengths" | "focus">;

export function EvaluationPanel({ playerId, firstName, items }: { playerId: string; firstName: string; items: EvaluationRow[] }) {
  const router = useRouter();
  const form = useForm(EvaluationInput);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const current = items.find((i) => i.id === editing);

  function open(item?: EvaluationRow) {
    setEditing(item?.id ?? "new");
    setRatings(item ? { technique: item.technique, tactics: item.tactics, fitness: item.fitness, attitude: item.attitude } : {});
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const send = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "send";
    const data = new FormData(e.currentTarget);
    const done = await form.submit(
      { period: data.get("period"), ...ratings, strengths: data.get("strengths"), focus: data.get("focus"), send },
      (input) =>
        editing === "new"
          ? api(`/players/${playerId}/evaluations`, { body: input })
          : api(`/evaluations/${editing}`, { method: "PUT", body: input }),
    );
    if (!done) return;
    setEditing(null);
    router.refresh();
  }

  async function act(job: () => ReturnType<typeof api>) {
    setError("");
    const res = await job();
    if (!res.ok) return setError(res.error.message);
    router.refresh();
  }

  const seed: Partial<Draft> = current ?? {};
  return (
    <section className="rise rounded-[2rem] bg-chalk p-6" aria-labelledby="rapor">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rapor" className="font-extrabold">Rapor penilaian</h2>
        {editing === null ? <Button size="sm" onClick={() => open()}>Tulis rapor</Button> : null}
      </div>
      <p className="mt-1 text-sm text-ink-soft">Rapor yang dikirim akan muncul di akun {firstName}. Draf hanya terlihat oleh pelatih.</p>
      {error ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}

      {editing !== null ? (
        <form key={editing} noValidate onSubmit={onSubmit} className="mt-4 grid gap-4 rounded-2xl border-2 border-line p-4">
          {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
          <div>
            <label htmlFor="period" className="mb-2 block text-sm font-bold">Periode</label>
            <input
              id="period" name="period" defaultValue={seed.period ?? ""} maxLength={60} placeholder="Contoh: Semester 1 2026"
              className="h-13 w-full rounded-2xl border-2 border-line bg-chalk px-4 outline-none focus:border-pitch"
            />
            {form.fields.period ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.period}</p> : null}
          </div>
          {EVALUATION_ASPECTS.map((a) => (
            <fieldset key={a.id}>
              <legend className="text-sm font-bold">{a.label}</legend>
              <p className="mb-2 text-sm text-ink-soft">{a.hint}</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer">
                    <input
                      type="radio" name={a.id} value={n} className="peer sr-only" checked={ratings[a.id] === n}
                      onChange={() => setRatings((r) => ({ ...r, [a.id]: n }))}
                    />
                    <span className="grid size-11 place-items-center rounded-full border-2 border-line bg-chalk font-extrabold transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ember">
                      {n}
                    </span>
                  </label>
                ))}
              </div>
              {form.fields[a.id] ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields[a.id]}</p> : null}
            </fieldset>
          ))}
          <p className="-mt-2 text-sm text-ink-soft">1 = perlu banyak latihan, 5 = sangat baik.</p>
          <div>
            <label htmlFor="strengths" className="mb-2 block text-sm font-bold">Yang sudah bagus</label>
            <textarea
              id="strengths" name="strengths" rows={3} maxLength={500} defaultValue={seed.strengths ?? ""}
              className="w-full rounded-2xl border-2 border-line bg-chalk p-4 outline-none focus:border-pitch"
            />
            {form.fields.strengths ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.strengths}</p> : null}
          </div>
          <div>
            <label htmlFor="focus" className="mb-2 block text-sm font-bold">Yang perlu dilatih</label>
            <textarea
              id="focus" name="focus" rows={3} maxLength={500} defaultValue={seed.focus ?? ""}
              className="w-full rounded-2xl border-2 border-line bg-chalk p-4 outline-none focus:border-pitch"
            />
            {form.fields.focus ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.focus}</p> : null}
          </div>
          <p className="text-sm text-ink-soft">Tulis dengan bahasa yang membangun, karena {firstName} akan membacanya sendiri.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" value="send" disabled={form.pending}>
              Kirim ke {firstName}
            </Button>
            <Button type="submit" variant="outline" disabled={form.pending}>Simpan draf</Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
          </div>
        </form>
      ) : null}

      {items.length === 0 && editing === null ? <p className="mt-3 text-ink-soft">Belum ada rapor.</p> : null}
      <ul className="mt-4 grid gap-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-2xl bg-mist p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-extrabold">{r.period}</p>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${r.status === "sent" ? "bg-turf/15 text-turf" : "bg-ember-soft text-ember-deep"}`}>
                {r.status === "sent" ? "Terkirim" : "Draf"}
              </span>
            </div>
            <p className="text-sm text-ink-soft">{dayLabel(r.date)}{r.authorName ? `, oleh ${r.authorName}` : ""}</p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {EVALUATION_ASPECTS.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3">
                  <dt className="text-sm">{a.label}</dt>
                  <dd><RatingDots value={r[a.id]} label={a.label} /></dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 break-words whitespace-pre-line text-sm"><b>Sudah bagus:</b> {r.strengths}</p>
            <p className="mt-1 break-words whitespace-pre-line text-sm"><b>Perlu dilatih:</b> {r.focus}</p>
            {r.canEdit && editing === null ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => act(() => api(`/evaluations/${r.id}/send`, { body: {} }))}>Kirim</Button>
                <Button size="sm" variant="outline" onClick={() => open(r)}>Ubah</Button>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => { if (window.confirm("Hapus draf rapor ini?")) void act(() => api(`/evaluations/${r.id}`, { method: "DELETE" })); }}
                >
                  Hapus
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
