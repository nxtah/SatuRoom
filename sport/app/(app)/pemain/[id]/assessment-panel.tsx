"use client";

import { Flag } from "lucide-react";
import { ProgressList } from "@/components/progress-list";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type { AssessmentRow, GoalRow, Progress, TemplateRow } from "@/server/assessments";

const field = "h-11 w-full min-w-0 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch";
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

export function AssessmentPanel({
  playerId,
  firstName,
  today,
  templates,
  items,
  progress,
  goals,
  canManageTemplates,
}: {
  playerId: string;
  firstName: string;
  today: string;
  templates: TemplateRow[];
  items: AssessmentRow[];
  progress: Progress[];
  goals: GoalRow[];
  canManageTemplates: boolean;
}) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const template = templates.find((t) => t.id === templateId);

  async function save(e: React.FormEvent<HTMLFormElement>, send: boolean) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const values: Record<string, number> = {};
    for (const m of template?.metrics ?? []) {
      const raw = String(data.get(`m_${m.key}`) ?? "").replace(",", ".").trim();
      if (raw !== "") values[m.key] = Number(raw);
    }
    setBusy(true);
    setError(undefined);
    setFields({});
    const r = await api(`/players/${playerId}/assessments`, {
      body: { templateId, assessedOn: data.get("assessedOn"), values, note: data.get("note"), send },
    });
    setBusy(false);
    if (!r.ok) {
      setFields(r.error.fields ?? {});
      return setError(r.error.message);
    }
    setOpen(false);
    router.refresh();
  }

  async function act(path: string, method: "POST" | "DELETE") {
    const r = await api(path, { method });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  return (
    <section className="rise rounded-[2rem] bg-chalk p-6" aria-labelledby="penilaian">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="penilaian" className="text-lg font-extrabold">Penilaian dan perkembangan</h2>
        {templates.length && !open ? <Button size="sm" onClick={() => setOpen(true)}>Nilai {firstName}</Button> : null}
      </div>
      {!templates.length ? (
        <p className="mt-2 text-sm text-ink-soft">
          Belum ada template penilaian yang terbit.{" "}
          {canManageTemplates ? <Link href="/penilaian" className="font-bold underline">Buat di Penilaian</Link> : "Minta kepala pelatih membuatnya."}
        </p>
      ) : null}
      {error && !open ? <div className="mt-3"><Alert tone="error">{error}</Alert></div> : null}

      {open && template ? (
        <form onSubmit={(e) => save(e, (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "send")} className="mt-4 grid gap-3 rounded-2xl bg-mist p-4" noValidate>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.length > 1 ? (
              <label className="grid gap-1 text-sm font-bold">
                Template
                <select className={field} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid gap-1 text-sm font-bold">
              Tanggal penilaian
              <input type="date" name="assessedOn" defaultValue={today} max={today} className={field} />
            </label>
          </div>
          <p className="text-xs text-ink-soft">Kosongkan ukuran yang tidak dites hari ini.</p>
          {template.metrics.map((m) => (
            <div key={m.key} className="grid gap-1">
              <label htmlFor={`m_${m.key}`} className="text-sm font-bold">
                {m.label} {m.type === "number" && m.unit ? <span className="font-normal text-ink-soft">({m.unit})</span> : null}
              </label>
              {m.type === "rating" ? (
                <div role="radiogroup" aria-label={m.label} className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input type="radio" name={`m_${m.key}`} value={n} className="peer sr-only" />
                      <span className="grid size-11 place-items-center rounded-full border-2 border-line bg-white font-extrabold transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-pitch">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <input id={`m_${m.key}`} name={`m_${m.key}`} inputMode="decimal" className={`${field} max-w-40`} />
              )}
              {fields[m.key] ? <p className="text-sm font-bold text-flame">{fields[m.key]}</p> : null}
            </div>
          ))}
          <label className="grid gap-1 text-sm font-bold">
            Catatan pelatih (boleh kosong)
            <textarea name="note" rows={3} maxLength={1000} className="rounded-xl border-2 border-line bg-white p-3 font-normal outline-none focus:border-pitch" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" value="send" disabled={busy}>{busy ? "Menyimpan…" : "Kirim ke pemain"}</Button>
            <Button type="submit" value="draft" variant="outline" disabled={busy}>Simpan draf</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
          </div>
        </form>
      ) : null}

      {progress.length ? (
        <div className="mt-4">
          <p className="mb-2 text-sm font-bold text-ink-soft">Perkembangan (dari penilaian terkirim)</p>
          <ProgressList progress={progress} />
        </div>
      ) : null}

      {items.length ? (
        <ul className="mt-4 grid gap-2">
          {items.map((a) => (
            <li key={a.id} className="rounded-2xl border-2 border-mist p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 font-bold">
                  {a.templateName} <span className="font-normal text-ink-soft">· {fmt(a.assessedOn)}{a.authorName ? ` · ${a.authorName}` : ""}</span>
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${a.status === "sent" ? "bg-turf-soft text-pitch" : "bg-sun/40 text-ink"}`}>
                  {a.status === "sent" ? "Terkirim" : "Draf"}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {a.metrics.filter((m) => a.values[m.key] !== undefined).map((m) => `${m.label} ${a.values[m.key]}${m.type === "rating" ? "/5" : m.unit ? ` ${m.unit}` : ""}`).join(" · ")}
              </p>
              {a.note ? <p className="mt-1 text-sm break-words whitespace-pre-line">{a.note}</p> : null}
              {a.canEdit ? (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={() => act(`/assessments/${a.id}/send`, "POST")}>Kirim</Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Hapus draf penilaian ini?") && act(`/assessments/${a.id}`, "DELETE")}>Hapus</Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <Goals playerId={playerId} goals={goals} />
    </section>
  );
}

const GOAL_STATUS = { open: "Berjalan", achieved: "Tercapai", dropped: "Dibatalkan" } as const;

function Goals({ playerId, goals }: { playerId: string; goals: GoalRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const r = await api(`/players/${playerId}/goals`, {
      body: { title: d.get("title"), detail: d.get("detail"), dueOn: d.get("dueOn"), shared: d.get("shared") === "on" },
    });
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setAdding(false);
    setError(undefined);
    router.refresh();
  }
  async function setStatus(id: string, status: GoalRow["status"]) {
    const r = await api(`/goals/${id}`, { method: "PATCH", body: { status } });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }
  return (
    <div className="mt-6 border-t-2 border-mist pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-extrabold"><Flag aria-hidden className="size-4" /> Target perkembangan</h3>
        {!adding ? <Button size="sm" variant="outline" onClick={() => setAdding(true)}>Tambah target</Button> : null}
      </div>
      {error ? <div className="mt-2"><Alert tone="error">{error}</Alert></div> : null}
      {adding ? (
        <form onSubmit={add} className="mt-3 grid gap-3 rounded-2xl bg-mist p-4">
          <label className="grid gap-1 text-sm font-bold">
            Target
            <input name="title" className={field} placeholder="Contoh: Juggling 50 kali" maxLength={120} />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            Cara mencapainya (boleh kosong)
            <input name="detail" className={field} maxLength={500} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold">
              Batas waktu (boleh kosong)
              <input type="date" name="dueOn" className={field} />
            </label>
            <label className="flex items-center gap-2 self-end text-sm font-bold">
              <input type="checkbox" name="shared" defaultChecked className="size-5 accent-pitch" /> Tampilkan ke pemain/orang tua
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Simpan target</Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Batal</Button>
          </div>
        </form>
      ) : null}
      {goals.length ? (
        <ul className="mt-3 grid gap-2">
          {goals.map((g) => (
            <li key={g.id} className={`flex flex-wrap items-center gap-2 rounded-2xl bg-mist p-3 ${g.status !== "open" ? "opacity-70" : ""}`}>
              <div className="min-w-0 flex-1 basis-48">
                <p className={`font-bold ${g.status === "achieved" ? "line-through decoration-2" : ""}`}>{g.title}</p>
                <p className="text-xs text-ink-soft">
                  {GOAL_STATUS[g.status]}
                  {g.dueOn ? ` · sampai ${fmt(g.dueOn)}` : ""}
                  {g.shared ? "" : " · hanya staf"}
                </p>
                {g.detail ? <p className="text-sm">{g.detail}</p> : null}
              </div>
              {g.status === "open" ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setStatus(g.id, "achieved")}>Tercapai</Button>
                  <Button size="sm" variant="ghost" onClick={() => setStatus(g.id, "dropped")}>Batalkan</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setStatus(g.id, "open")}>Buka lagi</Button>
              )}
            </li>
          ))}
        </ul>
      ) : !adding ? (
        <p className="mt-2 text-sm text-ink-soft">Belum ada target. Target membantu pemain dan orang tua tahu apa yang sedang dilatih.</p>
      ) : null}
    </div>
  );
}
