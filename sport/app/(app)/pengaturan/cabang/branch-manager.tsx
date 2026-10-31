"use client";

import { Building2, MapPin, Shirt, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { BranchInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { BranchRow } from "@/server/branches";

export function BranchManager({ branches, canCreate }: { branches: BranchRow[]; canCreate: boolean }) {
  const router = useRouter();
  const form = useForm(BranchInput);
  const [editing, setEditing] = useState<string | null>(null);
  const [problem, setProblem] = useState<string>();
  const current = branches.find((b) => b.id === editing);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const done = await form.submit(formValues(el), (input) =>
      editing ? api(`/branches/${editing}`, { method: "PUT", body: input }) : api("/branches", { body: input }),
    );
    if (!done) return;
    el.reset();
    setEditing(null);
    router.refresh();
  }

  async function archive(b: BranchRow) {
    if (!confirm(`Arsipkan cabang ${b.name}? Lokasinya ikut diarsipkan.`)) return;
    setProblem(undefined);
    const r = await api(`/branches/${b.id}`, { method: "DELETE" });
    if (!r.ok) return setProblem(r.error.message);
    router.refresh();
  }

  return (
    <div className="grid gap-5">
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      <ul className="rise grid gap-3">
        {branches.map((b) => (
          <li key={b.id} className="rounded-[2rem] bg-chalk p-5">
            <div className="flex flex-wrap items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-pitch text-white">
                <Building2 aria-hidden className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-extrabold">
                  {b.name}
                  {b.isPrimary ? <span className="ml-2 rounded-full bg-ember px-2.5 py-0.5 text-xs font-extrabold text-ink">Utama</span> : null}
                </p>
                <p className="text-sm text-ink-soft">{[b.address, b.phone].filter(Boolean).join(" · ") || "Alamat belum diisi"}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                [MapPin, `${b.locations} lokasi`],
                [Shirt, `${b.teams} tim`],
                [UsersRound, `${b.players} pemain`],
                [Building2, `${b.staff} staf khusus`],
              ].map(([Icon, text]) => {
                const I = Icon as typeof MapPin;
                return (
                  <span key={text as string} className="flex items-center gap-2 rounded-2xl bg-mist px-3 py-2 text-sm font-bold text-ink-soft">
                    <I aria-hidden className="size-4 shrink-0" /> {text as string}
                  </span>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(b.id)}>Ubah</Button>
              {!b.isPrimary && canCreate ? <Button size="sm" variant="danger" onClick={() => archive(b)}>Arsipkan</Button> : null}
            </div>
          </li>
        ))}
      </ul>
      {canCreate || editing ? (
        <form key={editing ?? "baru"} onSubmit={onSubmit} noValidate className="rise grid gap-5 rounded-[2rem] bg-chalk p-6" aria-label={editing ? "Ubah cabang" : "Tambah cabang"}>
          <h2 className="text-lg font-extrabold">{editing ? `Ubah ${current?.name}` : "Tambah cabang"}</h2>
          {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
          <Field label="Nama cabang" name="name" placeholder="Contoh: Cabang Dago" defaultValue={current?.name} error={form.fields.name} />
          <Field label="Alamat (boleh kosong)" name="address" defaultValue={current?.address ?? ""} error={form.fields.address} />
          <Field label="Nomor telepon (boleh kosong)" name="phone" inputMode="tel" defaultValue={current?.phone ?? ""} error={form.fields.phone} />
          {!editing ? <p className="text-sm text-ink-soft">Satu lokasi latihan otomatis dibuat untuk cabang baru. Lokasi lain bisa ditambah di Pengaturan → Lokasi.</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan cabang"}</Button>
            {editing ? <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
