"use client";

import { ArrowDown, ArrowUp, ClipboardCheck, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Metric } from "@/lib/assessment-defaults";
import { api } from "@/lib/api";
import type { TemplateFamily, TemplateRow } from "@/server/assessments";

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "ukuran";

const input = "h-11 w-full min-w-0 rounded-xl border-2 border-line bg-white px-3 outline-none focus:border-pitch";

function MetricLine({ m }: { m: Metric }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-mist px-3 py-2 text-sm">
      <span className="font-bold">{m.label}</span>
      <span className="text-ink-soft">
        {m.type === "rating" ? "Nilai 1-5" : `Angka${m.unit ? ` (${m.unit})` : ""}, ${m.better === "lower" ? "makin kecil makin baik" : "makin besar makin baik"}`}
      </span>
    </li>
  );
}

function Editor({ start, onClose }: { start: TemplateRow | null; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(start?.name ?? "");
  const [description, setDescription] = useState(start?.description ?? "");
  const [metrics, setMetrics] = useState<Metric[]>(start?.metrics ?? [{ key: "", label: "", type: "rating", better: "higher" }]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const patch = (i: number, p: Partial<Metric>) => setMetrics((list) => list.map((m, j) => (j === i ? { ...m, ...p } : m)));
  const move = (i: number, d: -1 | 1) =>
    setMetrics((list) => {
      const next = [...list];
      const [x] = next.splice(i, 1);
      next.splice(i + d, 0, x!);
      return next;
    });

  async function save(publish: boolean) {
    setBusy(true);
    setError(undefined);
    const used = new Set<string>();
    const clean = metrics
      .filter((m) => m.label.trim())
      .map((m) => {
        let key = m.key || slug(m.label);
        while (used.has(key)) key = `${key}_2`.slice(0, 40);
        used.add(key);
        return { ...m, key, label: m.label.trim(), unit: m.type === "number" ? m.unit || null : null };
      });
    const payload = { name, description, metrics: clean };
    const r = start
      ? await api<{ id: string }>(`/assessment-templates/${start.id}`, { method: "PUT", body: payload })
      : await api<{ id: string }>("/assessment-templates", { body: payload });
    if (!r.ok) {
      setBusy(false);
      return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    }
    if (publish) {
      const p = await api(`/assessment-templates/${r.data.id}/publish`, { method: "POST" });
      if (!p.ok) {
        setBusy(false);
        return setError(p.error.message);
      }
    }
    setBusy(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="rise grid gap-4 rounded-[2rem] bg-chalk p-5 sm:p-6">
      <h2 className="text-lg font-extrabold">{start ? `Ubah ${start.name}` : "Template baru"}</h2>
      {start?.status === "published" ? (
        <Alert tone="info">Template ini sudah dipakai. Perubahan disimpan sebagai versi baru; penilaian lama tetap memakai versi lamanya.</Alert>
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      <label className="grid gap-1 text-sm font-bold">
        Nama template
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Penilaian semester" />
      </label>
      <label className="grid gap-1 text-sm font-bold">
        Keterangan (boleh kosong)
        <input className={input} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-bold">Ukuran yang dinilai</legend>
        {metrics.map((m, i) => (
          <div key={i} className="grid gap-2 rounded-2xl bg-mist p-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input className={input} aria-label={`Nama ukuran ${i + 1}`} value={m.label} placeholder="Contoh: Lari 20 meter" onChange={(e) => patch(i, { label: e.target.value })} />
            <select className={input} aria-label="Jenis" value={m.type} onChange={(e) => patch(i, { type: e.target.value as Metric["type"], better: "higher" })}>
              <option value="rating">Nilai 1-5</option>
              <option value="number">Angka (tes)</option>
            </select>
            {m.type === "number" ? (
              <div className="grid grid-cols-2 gap-2">
                <input className={input} aria-label="Satuan" value={m.unit ?? ""} placeholder="detik" onChange={(e) => patch(i, { unit: e.target.value })} />
                <select className={input} aria-label="Arah baik" value={m.better} onChange={(e) => patch(i, { better: e.target.value as Metric["better"] })}>
                  <option value="higher">Besar = baik</option>
                  <option value="lower">Kecil = baik</option>
                </select>
              </div>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" aria-label="Naikkan" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp aria-hidden className="size-4" /></Button>
              <Button size="sm" variant="ghost" aria-label="Turunkan" disabled={i === metrics.length - 1} onClick={() => move(i, 1)}><ArrowDown aria-hidden className="size-4" /></Button>
              <Button size="sm" variant="ghost" aria-label="Hapus ukuran" disabled={metrics.length === 1} onClick={() => setMetrics((l) => l.filter((_, j) => j !== i))}><Trash2 aria-hidden className="size-4" /></Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setMetrics((l) => [...l, { key: "", label: "", type: "rating", better: "higher" }])}>
          <Plus aria-hidden className="size-4" /> Tambah ukuran
        </Button>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => save(true)}>{busy ? "Menyimpan…" : "Simpan dan terbitkan"}</Button>
        <Button variant="outline" disabled={busy} onClick={() => save(false)}>Simpan sebagai draf</Button>
        <Button variant="ghost" onClick={onClose}>Batal</Button>
      </div>
    </div>
  );
}

export function TemplateManager({ families, canManage }: { families: TemplateFamily[]; canManage: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TemplateRow | "new" | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function call(path: string, method: "POST" | "DELETE", body?: unknown) {
    setBusy(true);
    setError(undefined);
    const r = await api(path, { method, body });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  if (editing) return <Editor start={editing === "new" ? null : editing} onClose={() => setEditing(null)} />;

  return (
    <div className="grid gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {families.length === 0 ? (
        <EmptyState
          title="Belum ada template penilaian"
          action={
            canManage ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button disabled={busy} onClick={() => call("/assessment-templates", "POST", { useDefault: true })}>
                  <Sparkles aria-hidden className="size-5" /> Pakai template siap pakai
                </Button>
                <Button variant="outline" onClick={() => setEditing("new")}>Buat sendiri</Button>
              </div>
            ) : null
          }
        >
          {canManage ? "Mulai dari template siap pakai sesuai cabang olahraga akademi, lalu ubah sesukanya." : "Minta kepala pelatih atau pemilik membuat template."}
        </EmptyState>
      ) : canManage ? (
        <Button className="justify-self-start" onClick={() => setEditing("new")}>
          <Plus aria-hidden className="size-5" /> Template baru
        </Button>
      ) : null}
      <ul className="grid gap-4">
        {families.map((f) => {
          const show = f.published ?? f.draft!;
          return (
            <li key={f.familyId} className="rise rounded-[2rem] bg-chalk p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ember text-ink">
                  <ClipboardCheck aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-extrabold">{show.name}</p>
                  <p className="text-sm text-ink-soft">
                    {f.published ? `Terbit, versi ${f.published.version}` : "Belum terbit"}
                    {f.draft && f.published ? ` · ada draf versi ${f.draft.version}` : ""}
                    {f.published ? ` · dipakai ${f.published.used} kali` : ""}
                  </p>
                  {show.description ? <p className="mt-1 text-sm">{show.description}</p> : null}
                </div>
              </div>
              <ul className="mt-4 grid gap-1.5">
                {show.metrics.map((m) => (
                  <MetricLine key={m.key} m={m} />
                ))}
              </ul>
              {canManage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(f.draft ?? f.published!)}>
                    {f.draft ? "Lanjut ubah draf" : "Ubah"}
                  </Button>
                  {f.draft ? (
                    <Button size="sm" disabled={busy} onClick={() => call(`/assessment-templates/${f.draft!.id}/publish`, "POST")}>
                      Terbitkan versi {f.draft.version}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy}
                    onClick={() => confirm(`Arsipkan template ${show.name}? Penilaian lama tetap tersimpan.`) && call(`/assessment-templates/${show.id}`, "DELETE")}
                  >
                    Arsipkan
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
