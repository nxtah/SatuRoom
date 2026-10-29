"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SportPicker } from "@/components/sport-picker";
import { Maskot } from "@/components/maskot";
import { sportOf, type SportId } from "@/lib/sports";
import { api } from "@/lib/api";
import { AcademyInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

const STEPS = ["Selamat datang", "Cabang olahraga", "Data akademi"] as const;

/** Onboarding satu langkah per layar, dengan progres. Langkah berikutnya ditambah tiap tahap. */
export function Onboarding({ firstName, another }: { firstName: string; another: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(another ? 1 : 0);
  const [sport, setSport] = useState<SportId>("football");
  const form = useForm(AcademyInput);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit({ ...formValues(e.currentTarget), sport }, (input) => api("/academies", { body: input }));
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
          <span className="text-sm font-bold text-ink-soft tabular-nums">
            {step + 1}/{STEPS.length}
          </span>
          <div className="h-2.5 w-24 overflow-hidden rounded-full bg-mist sm:w-40">
            <div
              className="h-full rounded-full bg-turf transition-[width] duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-10">
        {step === 0 ? (
          <section key="welcome" className="rise text-center">
            <div className="pop mx-auto w-40">
              <Maskot />
            </div>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
              Halo {firstName}, selamat datang.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-lg text-ink-soft">
              Kita siapkan akademimu dalam beberapa langkah singkat. Semuanya bisa diubah nanti.
            </p>
            <Button size="lg" className="mt-10" onClick={() => setStep(1)}>
              Mulai
            </Button>
          </section>
        ) : step === 1 ? (
          <section key="sport" className="rise">
            {!another ? (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="mb-6 inline-flex items-center gap-2 rounded-full py-2 pr-3 text-sm font-bold text-ink-soft hover:text-ink"
              >
                <ArrowLeft aria-hidden className="size-4" /> Kembali
              </button>
            ) : null}
            <h1 className="text-4xl font-extrabold tracking-tight">Akademi cabang apa?</h1>
            <p className="mt-3 text-lg text-ink-soft">Menu dan fitur sama untuk semua cabang. Pilihan ini mengatur istilah dan posisi pemain.</p>
            <div className="mt-8">
              <SportPicker value={sport} onChange={setSport} />
            </div>
            <Button size="lg" className="mt-8" onClick={() => setStep(2)}>
              Lanjut
            </Button>
          </section>
        ) : (
          <section key="academy" className="rise">
            <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-6 inline-flex items-center gap-2 rounded-full py-2 pr-3 text-sm font-bold text-ink-soft hover:text-ink"
              >
                <ArrowLeft aria-hidden className="size-4" /> Kembali
              </button>
            <h1 className="text-4xl font-extrabold tracking-tight">Akademi {sportOf(sport).label.toLowerCase()} namanya apa?</h1>
            <p className="mt-3 text-lg text-ink-soft">
              Nama ini tampil untuk staf yang Anda undang. Kota dipakai untuk zona waktu jadwal.
            </p>
            <form onSubmit={onSubmit} noValidate className="mt-10 grid gap-6" aria-label="Data akademi">
              {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
              <Field
                label="Nama akademi"
                name="name"
                placeholder="Contoh: Akademi Garuda Muda"
                autoFocus
                error={form.fields.name}
              />
              <Field label="Kota" name="city" placeholder="Contoh: Bandung" autoComplete="address-level2" error={form.fields.city} />
              <Button type="submit" size="lg" disabled={form.pending} className="justify-self-start">
                {form.pending ? "Menyimpan…" : "Simpan dan lanjut"}
              </Button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
