"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { LocationInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";
import type { LocationRow } from "@/server/locations";

export function LocationManager({ locations, canManage, branches }: { locations: LocationRow[]; canManage: boolean; branches: { id: string; name: string }[] }) {
  const router = useRouter();
  const form = useForm(LocationInput);
  const [editing, setEditing] = useState<string | null>(null);
  const [problem, setProblem] = useState<string>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    const done = await form.submit({ name: data.get("name"), address: data.get("address"), branchId: data.get("branchId") ?? undefined }, (input) =>
      editing
        ? api<unknown>(`/locations/${editing}`, { method: "PATCH", body: input })
        : api<unknown>("/locations", { body: input }),
    );
    if (!done) return;
    formEl.reset();
    setEditing(null);
    router.refresh();
  }

  async function archive(id: string) {
    setProblem(undefined);
    const res = await api<void>(`/locations/${id}`, { method: "DELETE" });
    if (!res.ok) return setProblem(res.error.message);
    router.refresh();
  }

  const current = locations.find((l) => l.id === editing);
  return (
    <div className="grid gap-5">
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      <ul className="rise grid gap-3" aria-label="Daftar lokasi">
        {locations.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-[2rem] bg-chalk p-5">
            <div className="min-w-0 flex-1 basis-48">
              <p className="font-extrabold">
                {l.name}
                {l.isPrimary ? <span className="ml-2 rounded-full bg-ember px-2.5 py-0.5 text-xs font-extrabold text-ink">Utama</span> : null}
              </p>
              {branches.length > 1 ? <p className="text-sm font-bold text-pitch">{l.branchName}</p> : null}
              <p className="text-sm text-ink-soft">{l.address ?? "Alamat belum diisi"}</p>
              <p className="text-sm text-ink-soft">{l.upcoming} sesi mendatang</p>
            </div>
            {canManage ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(l.id)}>Ubah</Button>
                {!l.isPrimary ? <Button variant="danger" size="sm" onClick={() => archive(l.id)}>Arsipkan</Button> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {canManage ? (
        <form key={editing ?? "new"} onSubmit={onSubmit} noValidate aria-label={editing ? "Ubah lokasi" : "Tambah lokasi"} className="rise grid gap-5 rounded-[2rem] bg-chalk p-6">
          <h2 className="text-lg font-extrabold">{editing ? "Ubah lokasi" : "Tambah lokasi"}</h2>
          {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
          <Field label="Nama" name="name" defaultValue={current?.name} maxLength={80} error={form.fields.name} />
          {branches.length > 1 ? (
            <label className="grid gap-2 text-sm font-bold">
              Cabang
              <select name="branchId" defaultValue={current?.branchId ?? branches[0]?.id} className="h-12 rounded-2xl border-2 border-line bg-white px-4 text-base font-normal outline-none focus:border-pitch">
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          ) : null}
          <Field label="Alamat (boleh kosong)" name="address" defaultValue={current?.address ?? ""} maxLength={200} error={form.fields.address} />
          <div className="flex gap-2">
            <Button type="submit" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan"}</Button>
            {editing ? <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
