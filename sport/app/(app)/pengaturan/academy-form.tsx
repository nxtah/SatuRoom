"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SportPicker } from "@/components/sport-picker";
import type { SportId } from "@/lib/sports";
import { api } from "@/lib/api";
import { AcademyInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

export function AcademyForm({ name, city, address, sport, sportLocked }: { name: string; city: string; address: string; sport: SportId; sportLocked: boolean }) {
  const router = useRouter();
  const form = useForm(AcademyInput);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const done = await form.submit(formValues(e.currentTarget), (input) =>
      api("/academy", { method: "PATCH", body: input }),
    );
    if (!done) return;
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 grid gap-5 sm:grid-cols-2" aria-label="Profil akademi">
      {form.error && !form.error.fields ? (
        <div className="sm:col-span-2">
          <Alert tone="error">{form.error.message}</Alert>
        </div>
      ) : null}
      {saved ? (
        <div className="sm:col-span-2">
          <Alert tone="success">Profil akademi tersimpan.</Alert>
        </div>
      ) : null}
      <Field label="Nama akademi" name="name" defaultValue={name} error={form.fields.name} onChange={() => setSaved(false)} />
      <Field label="Kota" name="city" defaultValue={city} error={form.fields.city} onChange={() => setSaved(false)} />
      <div className="sm:col-span-2">
        <Field
          label="Alamat lengkap"
          name="address"
          defaultValue={address}
          placeholder="Contoh: Jl. Merdeka 12, dekat GOR Kota"
          hint="Boleh dikosongkan. Membantu orang tua menemukan tempat latihan."
          error={form.fields.address}
          onChange={() => setSaved(false)}
        />
      </div>
      <div className="sm:col-span-2">
        <SportPicker defaultValue={sport} disabled={sportLocked} error={form.fields.sport} />
        {sportLocked ? <p className="mt-2 text-sm text-ink-soft">Cabang olahraga terkunci karena sudah ada pemain.</p> : null}
      </div>
      <Button type="submit" disabled={form.pending} className="justify-self-start">
        {form.pending ? "Menyimpan…" : "Simpan perubahan"}
      </Button>
    </form>
  );
}
