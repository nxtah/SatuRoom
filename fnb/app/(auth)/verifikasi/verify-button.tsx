"use client";
import Link from "next/link";
import { useState } from "react";

/** Konfirmasi lewat tombol, bukan otomatis saat halaman dibuka, supaya pemindai email tidak memakai link-nya. */
export function VerifyButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [message, setMessage] = useState("");
  async function verify() {
    setState("busy");
    const res = await fetch("/api/v1/auth/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    if (res.ok) return setState("done");
    setMessage(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum berhasil.");
    setState("fail");
  }
  if (state === "done") return <div className="mt-4"><p className="rounded-2xl bg-basil/10 p-3 font-bold text-basil">Email terkonfirmasi.</p><Link href="/" className="mt-5 inline-flex h-12 items-center rounded-full bg-kitchen px-6 font-extrabold text-white">Lanjut</Link></div>;
  return <div className="mt-4">
    <p className="text-stone-600">Satu langkah lagi untuk mengaktifkan email Anda.</p>
    {state === "fail" ? <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-3 font-bold text-red-700">{message}</p> : null}
    <button onClick={verify} disabled={state === "busy"} className="mt-5 h-12 rounded-full bg-kitchen px-6 font-extrabold text-white disabled:opacity-50">{state === "busy" ? "Memeriksa…" : "Konfirmasi email"}</button>
  </div>;
}
