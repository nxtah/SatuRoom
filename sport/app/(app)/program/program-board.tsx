"use client";

import { Layers, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import { ProgramInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { ProgramRow } from "@/server/programs";

const EXAMPLES = [
  { name: "Reguler", level: "Pemula", description: "Latihan dasar 2x seminggu." },
  { name: "Elite", level: "Lanjutan", description: "Pemain terpilih, persiapan kompetisi." },
  { name: "Kiper", level: null, description: "Latihan khusus penjaga gawang." },
];

export function ProgramBoard({ programs, canManage, canEditTeams }: { programs: ProgramRow[]; canManage: boolean; canEditTeams: boolean }) {
  const router = useRouter();
  const form = useForm(ProgramInput);
  const [editing, setEditing] = useState<string | "new" | null>(programs.length === 0 && canManage ? "new" : null);
  const [problem, setProblem] = useState<string>();
  const [preset, setPreset] = useState<(typeof EXAMPLES)[number] | null>(null);
  const current = programs.find((p) => p.id === editing);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) =>
      current ? api(`/programs/${current.id}`, { method: "PUT", body: input }) : api("/programs", { body: input }),
    );
    if (!done) return;
    setEditing(null);
    setPreset(null);
    router.refresh();
  }

  async function archive(p: ProgramRow) {
    if (!confirm(`Arsipkan program ${p.name}? Tim di dalamnya tetap ada, hanya dilepas dari program.`)) return;
    setProblem(undefined);
    const r = await api(`/programs/${p.id}`, { method: "DELETE" });
    if (!r.ok) return setProblem(r.error.message);
    router.refresh();
  }

  const formEl = editing ? (
    <form key={`${editing}-${preset?.name ?? ""}`} onSubmit={onSubmit} noValidate aria-label={current ? "Ubah program" : "Program baru"} className="rise grid gap-5 rounded-[2rem] bg-chalk p-6">
      <h2 className="text-lg font-extrabold">{current ? `Ubah ${current.name}` : "Program baru"}</h2>
      {!current ? (
        <div>
          <p className="mb-2 text-sm font-bold">Pakai contoh</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((x) => (
              <button key={x.name} type="button" onClick={() => setPreset(x)} className="h-10 rounded-full border-2 border-line bg-white px-4 text-sm font-bold transition hover:border-pitch">
                {x.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <Field label="Nama program" name="name" placeholder="Contoh: Reguler" defaultValue={current?.name ?? preset?.name} error={form.fields.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Level (boleh kosong)" name="level" placeholder="Pemula, Menengah, Lanjutan" defaultValue={current?.level ?? preset?.level ?? ""} error={form.fields.level} />
        <Field label="Iuran bulanan anjuran (boleh kosong)" name="monthlyFee" inputMode="numeric" placeholder="250000" defaultValue={current?.monthlyFee ?? ""} error={form.fields.monthlyFee} />
      </div>
      <Field label="Keterangan (boleh kosong)" name="description" defaultValue={current?.description ?? preset?.description ?? ""} error={form.fields.description} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan program"}</Button>
        {programs.length ? <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button> : null}
      </div>
    </form>
  ) : null;

  return (
    <div className="grid gap-5">
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      {programs.length === 0 && !editing ? (
        <EmptyState title="Belum ada program">Program membantu mengelompokkan tim, misalnya Reguler dan Elite.</EmptyState>
      ) : null}
      {canManage && !editing ? (
        <Button className="justify-self-start" onClick={() => setEditing("new")}>
          <Plus aria-hidden className="size-5" /> Program baru
        </Button>
      ) : null}
      {editing === "new" ? formEl : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {programs.map((p) =>
          editing === p.id ? (
            <li key={p.id} className="md:col-span-2">{formEl}</li>
          ) : (
            <li key={p.id} className="rise flex min-w-0 flex-col rounded-[2rem] bg-chalk p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ember text-ink">
                  <Layers aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-lg font-extrabold">{p.name}</p>
                  <p className="text-sm text-ink-soft">
                    {[p.level, p.monthlyFee !== null ? `${rupiah(p.monthlyFee)}/bulan` : null].filter(Boolean).join(" · ") || "Tanpa level"}
                  </p>
                </div>
              </div>
              {p.description ? <p className="mt-3 text-sm">{p.description}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {p.teams.length ? (
                  p.teams.map((t) => (
                    <Link key={t.id} href={`/tim/${t.id}`} className="rounded-full bg-mist px-3 py-1 text-sm font-bold hover:bg-turf-soft">
                      {t.name} · {t.players} pemain
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-ink-soft">Belum ada tim. {canEditTeams ? "Pilih program ini di form tim." : ""}</p>
                )}
              </div>
              {canManage ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>Ubah</Button>
                  {canEditTeams ? <ButtonLink size="sm" variant="ghost" href={`/tim/baru?program=${p.id}`}>Buat tim di program ini</ButtonLink> : null}
                  <Button size="sm" variant="danger" onClick={() => archive(p)}>Arsipkan</Button>
                </div>
              ) : null}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
