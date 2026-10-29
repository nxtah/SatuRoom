"use client";

import { useState } from "react";
import { z } from "zod";
import { PasswordField } from "@/components/password-field";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { api } from "@/lib/api";
import { password } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

const Input = z.object({ password });

export function ResetForm({ token }: { token: string }) {
  const form = useForm(Input);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await form.submit(formValues(e.currentTarget), (input) =>
      api("/auth/reset-password", { body: { token, password: input.password } }),
    );
    if (result) setDone(true);
  }

  if (done) {
    return (
      <div className="rise grid gap-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Password diganti</h1>
        <Alert tone="success">Semua perangkat lain sudah dikeluarkan. Masuk dengan password baru.</Alert>
        <ButtonLink href="/masuk">Masuk</ButtonLink>
      </div>
    );
  }

  return (
    <div className="rise">
      <h1 className="text-3xl font-extrabold tracking-tight">Buat password baru</h1>
      <p className="mt-2 text-ink-soft">Setelah diganti, semua perangkat yang masih masuk akan dikeluarkan.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-5" aria-label="Form password baru">
        {!token ? <Alert tone="error">Link tidak lengkap. Buka lagi link dari email.</Alert> : null}
        {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
        <PasswordField
          label="Password baru"
          name="password"
          autoComplete="new-password"
          hint="Minimal 8 karakter."
          autoFocus
          error={form.fields.password}
        />
        <Button type="submit" block disabled={form.pending || !token}>
          {form.pending ? "Menyimpan…" : "Simpan password"}
        </Button>
      </form>
    </div>
  );
}
