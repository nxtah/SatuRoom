"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { SettingsInput, VenueInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { VenueProfile } from "@/server/venue";

const schema = VenueInput.and(SettingsInput);

export function SettingsForm({ venue }: { venue: VenueProfile }) {
  const router = useRouter();
  const form = useForm(schema);
  const [saved, setSaved] = useState(false);
  const s = venue.settings;
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const el = e.currentTarget;
    const done = await form.submit({ ...formValues(el), publicBooking: (el.elements.namedItem("publicBooking") as HTMLInputElement).checked }, (input) => api("/venue", { method: "PATCH", body: input }));
    if (!done) return;
    setSaved(true);
    router.refresh();
  }
  const sel = "h-13 w-full rounded-xl border-2 border-line bg-chalk px-3";
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5" aria-label="Aturan tempat">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      {saved ? <Alert tone="success">Tersimpan.</Alert> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nama tempat" name="name" defaultValue={venue.name} error={form.fields.name} />
        <Field label="Kota" name="city" defaultValue={venue.city ?? ""} error={form.fields.city} />
        <Field label="Jam buka" name="openTime" type="time" defaultValue={s.openTime} error={form.fields.openTime} />
        <Field label="Jam tutup" name="closeTime" type="time" defaultValue={s.closeTime} error={form.fields.closeTime} />
        <div>
          <label htmlFor="step" className="mb-2 block text-sm font-bold">Pembulatan waktu sewa</label>
          <select id="step" name="billingStepMin" defaultValue={s.billingStepMin} className={sel}>{[10, 15, 30, 60].map((m) => <option key={m} value={m}>Per {m} menit</option>)}</select>
        </div>
        <Field label="Minimal sewa (menit)" name="minMinutes" inputMode="numeric" defaultValue={s.minMinutes} hint="Main 20 menit tetap ditagih sebesar ini." error={form.fields.minMinutes} />
        <Field label="Diskon member Silver (%)" name="discountSilver" inputMode="numeric" defaultValue={s.discountSilver} error={form.fields.discountSilver} />
        <Field label="Diskon member Gold (%)" name="discountGold" inputMode="numeric" defaultValue={s.discountGold} error={form.fields.discountGold} />
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="publicBooking" defaultChecked={s.publicBooking} className="mt-1 size-5 accent-[#0f3a2d]" />
        <span><b className="block">Terima permintaan booking dari link publik</b><span className="text-sm text-ink-soft">Pelanggan mengisi form tanpa akun, staf memilihkan meja. Link ada di halaman Booking. Kode tempat: <b>{venue.code}</b>.</span></span>
      </label>
      <Button type="submit" disabled={form.pending} className="justify-self-start">{form.pending ? "Menyimpan…" : "Simpan"}</Button>
    </form>
  );
}
