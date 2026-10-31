"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { TeamInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

/** Kelompok umur kurikulum PSSI; hanya saran, bebas diubah. */
const PRESETS = [
  { name: "KU 6-9", min: 6, max: 9 },
  { name: "KU 10-13", min: 10, max: 13 },
  { name: "KU 14-17", min: 14, max: 17 },
];

interface Props {
  team?: { id: string; name: string; ageMin: number | null; ageMax: number | null; locationId?: string };
  /** Lokasi latihan; pilihan tampil bila lebih dari satu. */
  locations: { id: string; name: string; branchName: string }[];
  /** Ke mana setelah tersimpan. `{id}` diganti id tim. */
  next: string;
}

export function TeamForm({ team, next, locations }: Props) {
  const router = useRouter();
  const form = useForm(TeamInput);
  const ref = useRef<HTMLFormElement>(null);

  function preset(p: (typeof PRESETS)[number]) {
    const el = ref.current;
    if (!el) return;
    (el.elements.namedItem("name") as HTMLInputElement).value = p.name;
    (el.elements.namedItem("ageMin") as HTMLInputElement).value = String(p.min);
    (el.elements.namedItem("ageMax") as HTMLInputElement).value = String(p.max);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) =>
      team
        ? api<{ id?: string }>(`/teams/${team.id}`, { method: "PATCH", body: input })
        : api<{ id?: string }>("/teams", { body: input }),
    );
    if (!done) return;
    const id = team?.id ?? done.data?.id ?? "";
    router.push(next.replace("{id}", id));
    router.refresh();
  }

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="grid gap-5" aria-label={team ? "Ubah tim" : "Buat tim"}>
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      {!team ? (
        <div>
          <p className="mb-2 text-sm font-bold">Pakai kelompok umur PSSI</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => preset(p)}
                className="h-10 rounded-full border-2 border-line bg-chalk px-4 text-sm font-bold transition hover:border-turf hover:bg-turf-soft"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <Field
        label="Nama tim"
        name="name"
        defaultValue={team?.name}
        placeholder="Contoh: KU 10-13 atau Tim Garuda"
        error={form.fields.name}
        autoFocus={!team}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Umur dari"
          name="ageMin"
          inputMode="numeric"
          defaultValue={team?.ageMin ?? ""}
          hint="Boleh kosong"
          error={form.fields.ageMin}
        />
        <Field
          label="Sampai umur"
          name="ageMax"
          inputMode="numeric"
          defaultValue={team?.ageMax ?? ""}
          hint="Boleh kosong"
          error={form.fields.ageMax}
        />
      </div>
      {locations.length > 1 ? (
        <label className="grid gap-2 text-sm font-bold">
          Tempat latihan utama
          <select name="locationId" defaultValue={team?.locationId ?? locations[0]?.id} className="h-12 rounded-2xl border-2 border-line bg-white px-4 text-base font-normal outline-none focus:border-pitch">
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.branchName} · {l.name}
              </option>
            ))}
          </select>
          <span className="font-normal text-ink-soft">Menentukan cabang tim. Staf cabang hanya melihat tim di cabangnya.</span>
        </label>
      ) : null}
      <Button type="submit" disabled={form.pending} className="justify-self-start">
        {form.pending ? "Menyimpan…" : team ? "Simpan perubahan" : "Buat tim"}
      </Button>
    </form>
  );
}
