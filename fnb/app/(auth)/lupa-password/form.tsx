"use client";
import { useState } from "react";

export function ForgotForm() {
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setState("busy"); setError("");
    const res = await fetch("/api/v1/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: new FormData(e.currentTarget).get("email") }) }).catch(() => null);
    if (res?.ok) return setState("sent");
    setError(res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum berhasil." : "Koneksi terputus. Coba lagi.");
    setState("idle");
  }
  if (state === "sent") return <p className="mt-6 rounded-2xl bg-basil/10 p-4 font-bold text-basil">Jika email itu terdaftar, link sudah kami kirim. Cek kotak masuk dan folder spam.</p>;
  return <form onSubmit={submit} className="mt-5 grid gap-4">
    <label className="grid gap-2 font-bold">Email<input name="email" type="email" required className="h-13 rounded-2xl border-2 border-stone-200 px-4 font-normal outline-none focus:border-saffron" /></label>
    {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 font-bold text-red-700">{error}</p> : null}
    <button disabled={state === "busy"} className="h-13 rounded-full bg-kitchen font-extrabold text-white disabled:opacity-50">{state === "busy" ? "Mengirim…" : "Kirim link"}</button>
  </form>;
}
