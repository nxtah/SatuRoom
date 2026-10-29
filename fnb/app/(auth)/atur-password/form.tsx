"use client";
import Link from "next/link";
import { useState } from "react";

export function ResetForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setState("busy"); setError("");
    const res = await fetch("/api/v1/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password: new FormData(e.currentTarget).get("password") }) }).catch(() => null);
    if (res?.ok) return setState("done");
    setError(res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum berhasil." : "Koneksi terputus. Coba lagi.");
    setState("idle");
  }
  if (state === "done") return <div className="mt-4"><p className="rounded-2xl bg-basil/10 p-3 font-bold text-basil">Password diganti. Silakan masuk dengan password baru.</p><Link href="/masuk" className="mt-5 inline-flex h-12 items-center rounded-full bg-kitchen px-6 font-extrabold text-white">Masuk</Link></div>;
  return <form onSubmit={submit} className="mt-5 grid gap-4">
    <label className="grid gap-2 font-bold">Password baru<input name="password" type="password" minLength={8} required autoComplete="new-password" className="h-13 rounded-2xl border-2 border-stone-200 px-4 font-normal outline-none focus:border-saffron" /><span className="text-sm font-normal text-stone-600">Minimal 8 karakter.</span></label>
    {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</p> : null}
    <button disabled={state === "busy"} className="h-13 rounded-full bg-kitchen font-extrabold text-white disabled:opacity-50">{state === "busy" ? "Menyimpan…" : "Simpan password"}</button>
  </form>;
}
