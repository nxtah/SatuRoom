"use client";
import { useState } from "react";

const input = "h-13 rounded-2xl border-2 border-stone-200 px-4 font-normal outline-none focus:border-saffron";

export function RegisterForm({ defaultEmail = "", next = "/" }: { defaultEmail?: string; next?: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: f.get("name"), email: f.get("email"), password: f.get("password") }),
    }).catch(() => null);
    if (!res) {
      setError("Koneksi terputus. Periksa internet lalu coba lagi.");
      return setBusy(false);
    }
    if (!res.ok) {
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Terjadi gangguan. Coba lagi.");
      return setBusy(false);
    }
    location.replace(next);
  }

  return (
    <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-2 font-bold">Nama Anda<input name="name" autoComplete="name" required className={input} /></label>
      <label className="grid gap-2 font-bold">Email<input name="email" type="email" autoComplete="email" required defaultValue={defaultEmail} className={input} /></label>
      <label className="grid gap-2 font-bold">
        Password
        <input name="password" type="password" autoComplete="new-password" minLength={8} required className={input} />
        <span className="text-sm font-normal text-stone-600">Minimal 8 karakter.</span>
      </label>
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</p> : null}
      <button disabled={busy} className="h-13 rounded-full bg-kitchen font-extrabold text-white disabled:opacity-50">{busy ? "Membuat akun…" : "Daftar"}</button>
    </form>
  );
}
