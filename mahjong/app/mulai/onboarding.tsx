"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { Maskot } from "@/components/maskot";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { VenueInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

const STEPS = ["Selamat datang", "Data tempat"] as const;

export function Onboarding({ firstName, another }: { firstName: string; another: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(another ? 1 : 0);
  const form = useForm(VenueInput);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) => api("/venues", { body: input }));
    if (done) {
      router.replace("/?selamat=1");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-chalk">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-4 px-5 pt-6">
        <Brand href="/mulai" />
        <div className="ml-auto flex items-center gap-3" aria-label={`Langkah ${step + 1} dari ${STEPS.length}`}>
          <span className="tnum text-sm font-bold text-ink-soft">{step + 1}/{STEPS.length}</span>
          <div className="h-2.5 w-24 overflow-hidden rounded-md bg-mist sm:w-40">
            <div className="h-full rounded-md bg-ember transition-[width] duration-500" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10">
        {step === 0 ? (
          <section key="welcome" className="rise text-center">
            <div className="pop mx-auto w-36">
              <Maskot />
            </div>
            <h1 className="mt-6 text-4xl font-bold text-balance sm:text-5xl">Halo {firstName}, mari buka mejanya.</h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
              Kita siapkan rumah mahjong Anda dengan empat meja contoh. Nama meja, tarif, dan jam buka bisa diubah kapan saja.
            </p>
            <Button size="lg" className="mt-10" onClick={() => setStep(1)}>
              Mulai
            </Button>
          </section>
        ) : (
          <section key="venue" className="rise">
            {!another ? (
              <button type="button" onClick={() => setStep(0)} className="mb-6 inline-flex items-center gap-2 rounded-xl py-2 pr-3 text-sm font-bold text-ink-soft hover:text-ink">
                <ArrowLeft aria-hidden className="size-4" /> Kembali
              </button>
            ) : null}
            <h1 className="text-4xl font-bold">Rumah mahjongnya apa namanya?</h1>
            <p className="mt-3 text-lg text-ink-soft">Nama ini tampil di struk, link booking, dan untuk staf yang Anda undang. Kota dipakai untuk zona waktu.</p>
            <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-6" aria-label="Data tempat">
              {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
              <Field label="Nama tempat" name="name" placeholder="Contoh: Naga Jade Mahjong Club" autoFocus error={form.fields.name} />
              <Field label="Kota" name="city" placeholder="Contoh: Bandung" autoComplete="address-level2" error={form.fields.city} />
              <Button type="submit" size="lg" disabled={form.pending} className="justify-self-start">
                {form.pending ? "Menyimpan…" : "Simpan dan buka lantai"}
              </Button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
