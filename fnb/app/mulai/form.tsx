"use client";
import { useState } from "react";
import { ImageField } from "@/components/image-field";

const input = "h-13 rounded-2xl border-2 border-stone-200 px-4 font-normal focus:border-saffron focus:outline-none";

/** Dua langkah: data usaha, lalu logo (boleh dilewati dan diatur nanti di Pengaturan). */
export function StartForm() {
  const [step, setStep] = useState<"data" | "logo">("data");
  const [city, setCity] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/v1/businesses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: f.get("name"), city: f.get("city") }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { setError(data.error ?? "Belum berhasil membuat bisnis."); return setBusy(false); }
    setCity(String(f.get("city") ?? "")); setBusy(false); setStep("logo");
  }
  async function finish() {
    setBusy(true); setError("");
    if (logo) {
      const r = await fetch("/api/v1/business-profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ logoUrl: logo, city, address: null, publicMenuEnabled: true }) });
      if (!r.ok) { setError(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Logo belum tersimpan."); return setBusy(false); }
    }
    location.replace("/");
  }

  if (step === "logo") return <div className="mt-8 grid gap-5">
    <div><h2 className="text-2xl font-extrabold">Tambahkan logo usaha</h2><p className="mt-1 text-stone-600">Logo tampil di Beranda, menu samping, dan menu digital pelanggan. Boleh dilewati dan diatur nanti di Pengaturan.</p></div>
    <ImageField kind="logo" label="Logo usaha" value={logo} onChange={setLogo} />
    {error ? <p role="alert" className="text-red-700">{error}</p> : null}
    <button onClick={finish} disabled={busy} className="h-13 rounded-full bg-kitchen font-extrabold text-white disabled:opacity-60">{busy ? "Menyimpan…" : logo ? "Simpan dan mulai" : "Lewati, mulai sekarang"}</button>
  </div>;

  return <form className="mt-8 grid gap-4" onSubmit={create}>
    <label className="grid gap-2 font-bold">Nama usaha<input name="name" required className={input} placeholder="Contoh: Kedai Rasa" /></label>
    <label className="grid gap-2 font-bold">Kota<input name="city" required className={input} placeholder="Bandung" /></label>
    {error ? <p className="text-red-700">{error}</p> : null}
    <button disabled={busy} className="h-13 rounded-full bg-kitchen font-extrabold text-white disabled:opacity-60">{busy ? "Menyiapkan…" : "Lanjut"}</button>
  </form>;
}
