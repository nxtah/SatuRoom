"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { PublicBookingInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

export function BookingRequestForm({ code, today, open }: { code: string; today: string; open: string }) {
  const form = useForm(PublicBookingInput);
  const [sent, setSent] = useState<"created" | "duplicate">();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) => api<{ status: "created" | "duplicate" }>(`/public/bookings/${code}`, { body: input }));
    if (done) setSent(done.data.status);
  }

  if (sent)
    return (
      <div className="pop text-center">
        <p className="cjk text-6xl text-ember" aria-hidden>發</p>
        <h2 className="mt-2 text-2xl font-bold">{sent === "created" ? "Permintaan terkirim" : "Permintaan ini sudah masuk"}</h2>
        <p className="mt-2 text-ink-soft">Pengelola akan menghubungi lewat WhatsApp untuk memastikan meja dan jamnya.</p>
      </div>
    );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5" aria-label="Pesan meja">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <Field label="Nama" name="name" autoComplete="name" error={form.fields.name} />
      <Field label="Nomor WhatsApp" name="phone" type="tel" inputMode="tel" autoComplete="tel" error={form.fields.phone} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tanggal" name="date" type="date" min={today} defaultValue={today} error={form.fields.date} />
        <Field label="Jam" name="startTime" type="time" defaultValue={open} error={form.fields.startTime} />
        <div>
          <label htmlFor="dur" className="mb-2 block text-sm font-bold">Lama main</label>
          <select id="dur" name="durationMin" defaultValue="120" className="h-13 w-full rounded-xl border-2 border-line bg-chalk px-3">
            {[60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m / 60} jam</option>)}
          </select>
        </div>
        <Field label="Jumlah orang" name="pax" inputMode="numeric" defaultValue="4" error={form.fields.pax} />
      </div>
      <Field label="Catatan (boleh kosong)" name="note" placeholder="Contoh: butuh meja otomatis" error={form.fields.note} />
      <Button type="submit" size="lg" disabled={form.pending}>{form.pending ? "Mengirim…" : "Kirim permintaan"}</Button>
    </form>
  );
}
