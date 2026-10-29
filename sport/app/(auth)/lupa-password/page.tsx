"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { EmailInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

export default function LupaPasswordPage() {
  const form = useForm(EmailInput);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) =>
      api("/auth/forgot-password", { body: input }),
    );
    if (done) setSent(true);
  }

  return (
    <div className="rise">
      <title>Lupa password | SatuRoom Sport</title>
      <h1 className="text-3xl font-extrabold tracking-tight">Lupa password</h1>
      <p className="mt-2 text-ink-soft">Masukkan email akun Anda. Kami kirim link untuk membuat password baru.</p>
      {sent ? (
        <div className="mt-8 grid gap-6">
          <Alert tone="success">
            Kalau email itu terdaftar, link sudah dikirim. Link berlaku 1 jam. Cek juga folder spam.
          </Alert>
          <Link href="/masuk" className="font-bold underline decoration-pitch decoration-2 underline-offset-4">
            Kembali ke halaman masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-5" aria-label="Form lupa password">
          {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
          <Field label="Email" name="email" type="email" autoComplete="email" autoFocus error={form.fields.email} />
          <Button type="submit" block disabled={form.pending}>
            {form.pending ? "Mengirim…" : "Kirim link"}
          </Button>
          <Link href="/masuk" className="text-center text-sm font-bold text-ink-soft hover:text-ink">
            Kembali ke halaman masuk
          </Link>
        </form>
      )}
    </div>
  );
}
