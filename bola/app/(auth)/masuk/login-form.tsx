"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { PasswordField } from "@/components/password-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { LoginInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

const NOTICE: Record<string, string> = {
  google: "Masuk dengan Google belum berhasil. Coba lagi, atau pakai email.",
  google_off: "Masuk dengan Google belum tersedia. Silakan pakai email.",
  google_conflict: "Email ini sudah tertaut ke akun Google lain.",
};

export function LoginForm({ next = "/", lanjut, google, notice }: { next?: string; lanjut?: string; google: boolean; notice?: string }) {
  const form = useForm(LoginInput);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) =>
      api("/auth/login", { body: input }),
    );
    // Navigasi penuh: tujuan akhir ditentukan server (akademi, akun pemain, atau undangan) lewat redirect,
    // dan router klien bisa berputar-putar bila redirect itu terjadi saat transisi.
    if (done) window.location.replace(next);
  }

  return (
    <div className="rise">
      <h1 className="text-3xl font-extrabold tracking-tight">Masuk</h1>
      <p className="mt-2 text-ink-soft">Selamat datang kembali. Masuk untuk membuka akademi Anda.</p>

      <div className="mt-8 grid gap-5">
        {google ? (
          <>
            <GoogleButton next={lanjut} />
            <OrDivider />
          </>
        ) : null}
      </div>

      <form onSubmit={onSubmit} noValidate className={`${google ? "mt-5" : "mt-8"} grid gap-5`} aria-label="Form masuk">
        {notice && NOTICE[notice] ? <Alert tone="error">{NOTICE[notice]}</Alert> : null}
        {form.error ? <Alert tone="error">{form.error.message}</Alert> : null}
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
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
