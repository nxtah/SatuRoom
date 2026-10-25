"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { RegisterInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

export function RegisterForm() {
  const router = useRouter();
  const form = useForm(RegisterInput);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = formValues(e.currentTarget);
    const done = await form.submit(values, (input) => api("/auth/register", { body: input }));
    if (done) router.push(`/cek-email?email=${encodeURIComponent(String(values.email))}`);
  }

  return (
    <div className="rise">
      <h1 className="text-3xl font-extrabold tracking-tight">Buat akun</h1>
      <p className="mt-2 text-ink-soft">Gratis. Setelah ini Anda langsung bisa menyiapkan akademi.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-5" aria-label="Form daftar">
        {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
        <Field label="Nama Anda" name="name" autoComplete="name" autoFocus error={form.fields.name} />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          hint="Kami kirim link konfirmasi ke email ini."
          error={form.fields.email}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          hint="Minimal 8 karakter."
          error={form.fields.password}
        />
        <Button type="submit" block disabled={form.pending}>
          {form.pending ? "Membuat akun…" : "Daftar"}
        </Button>
      </form>

      <p className="mt-8 text-center text-ink-soft">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-bold text-ink underline decoration-ember decoration-2 underline-offset-4">
          Masuk
        </Link>
      </p>
    </div>
  );
}
