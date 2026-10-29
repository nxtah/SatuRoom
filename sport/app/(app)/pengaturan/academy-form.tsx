"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { AcademyInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

export function AcademyForm({ name, city }: { name: string; city: string }) {
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
      <Button type="submit" disabled={form.pending} className="justify-self-start">
        {form.pending ? "Menyimpan…" : "Simpan perubahan"}
      </Button>
    </form>
  );
}
