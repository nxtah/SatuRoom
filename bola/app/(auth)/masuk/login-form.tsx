"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { LoginInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

export function LoginForm() {
  const router = useRouter();
  const form = useForm(LoginInput);
  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResent(false);
    const done = await form.submit(formValues(e.currentTarget), (input) =>
      api("/auth/login", { body: input }),
    );
    if (done) {
      router.replace("/");
      router.refresh();
    }
  }

  async function resend() {
    await api("/auth/resend-verification", { body: { email } });
    setResent(true);
  }

  return (
    <div className="rise">
      <h1 className="text-3xl font-extrabold tracking-tight">Masuk</h1>
      <p className="mt-2 text-ink-soft">Selamat datang kembali. Masuk untuk membuka akademi Anda.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 grid gap-5" aria-label="Form masuk">
        {form.error ? (
          <Alert tone="error">
            {form.error.message}
            {form.error.code === "email_unverified" ? (
              <>
                {" "}
                {resent ? (
                  "Link baru sudah dikirim."
                ) : (
                  <button type="button" onClick={resend} className="underline underline-offset-2">
                    Kirim ulang link
                  </button>
                )}
              </>
            ) : null}
          </Alert>
        ) : null}
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={form.fields.email}
        />
        <PasswordField label="Password" name="password" autoComplete="current-password" error={form.fields.password} />
        <Link href="/lupa-password" className="-mt-2 justify-self-end text-sm font-bold text-ember-deep hover:underline">
          Lupa password?
        </Link>
        <Button type="submit" block disabled={form.pending}>
          {form.pending ? "Memeriksa…" : "Masuk"}
        </Button>
      </form>

      <p className="mt-8 text-center text-ink-soft">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-bold text-ink underline decoration-ember decoration-2 underline-offset-4">
          Daftar gratis
        </Link>
      </p>
    </div>
  );
}
