"use client";

import { useState } from "react";
import { Maskot } from "@/components/maskot";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { PublicRegistrationInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";

export function PublicRegistrationForm({ token, academyName }: { token: string; academyName: string }) {
  const form = useForm(PublicRegistrationInput);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const result = await form.submit(
      {
        fullName: data.get("fullName"),
        birthDate: data.get("birthDate"),
        guardianName: data.get("guardianName"),
        guardianPhone: data.get("guardianPhone"),
        note: data.get("note") ?? "",
        consent: data.get("consent") === "on",
        website: data.get("website") ?? "",
      },
      (input) => api(`/public/registrations/${token}`, { body: input }),
    );
    if (result) setDone(true);
  }

  if (done) {
    return (
      <div role="status" className="rise mt-8 flex flex-col items-center rounded-[2rem] bg-chalk px-6 py-12 text-center">
        <div className="w-32">
          <Maskot />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold">Pendaftaran terkirim</h2>
        <p className="mt-2 max-w-sm text-ink-soft">
          Terima kasih. {academyName} akan menghubungi orang tua atau wali lewat nomor HP yang diisi.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rise mt-6 grid gap-5 rounded-[2rem] bg-chalk p-5 sm:p-7" aria-label="Pendaftaran pemain">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-lg font-extrabold">Calon pemain</legend>
        <Field label="Nama lengkap" name="fullName" autoComplete="off" error={form.fields.fullName} />
        <Field label="Tanggal lahir" name="birthDate" type="date" error={form.fields.birthDate} className="max-w-xs" />
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-lg font-extrabold">Orang tua atau wali</legend>
        <Field label="Nama orang tua atau wali" name="guardianName" autoComplete="name" error={form.fields.guardianName} />
        <Field
          label="Nomor HP (WhatsApp)" name="guardianPhone" type="tel" inputMode="tel" autoComplete="tel"
          placeholder="0812 3456 7890" error={form.fields.guardianPhone}
          hint="Dipakai akademi untuk menghubungi Anda."
        />
        <div>
          <label htmlFor="note" className="mb-2 block text-sm font-bold">Catatan (boleh dikosongkan)</label>
          <textarea
            id="note" name="note" rows={3} maxLength={300} placeholder="Contoh: pernah main di SSB lain, atau ingin masuk tim tertentu."
            className="w-full rounded-2xl border-2 border-line bg-chalk p-4 outline-none focus:border-pitch"
          />
          {form.fields.note ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.note}</p> : null}
        </div>
      </fieldset>

      {/* Jebakan untuk bot: manusia tidak melihat dan tidak mengisinya. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Situs web
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="consent" className="mt-1 size-5 shrink-0 accent-[var(--color-pitch)]" />
          <span className="text-sm leading-relaxed">
            Saya orang tua atau wali calon pemain ini, dan setuju data di atas dipakai {academyName} untuk pendaftaran dan keperluan latihan.
          </span>
        </label>
        {form.fields.consent ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.consent}</p> : null}
      </div>

      <Button type="submit" size="lg" block disabled={form.pending}>
        {form.pending ? "Mengirim" : "Kirim pendaftaran"}
      </Button>
    </form>
  );
}
