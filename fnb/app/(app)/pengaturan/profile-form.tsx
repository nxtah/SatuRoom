"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageField } from "@/components/image-field";
import { btnPrimary, btnSoft, call, Field, input, Toggle } from "@/components/ui";
import type { BusinessProfile } from "@/server/business-profile";

export function ProfileForm({ initial }: { initial: BusinessProfile }) {
  const router = useRouter();
  const [logo, setLogo] = useState(initial.logoUrl);
  const [city, setCity] = useState(initial.city ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [pub, setPub] = useState(initial.publicMenuEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setError(""); setSaved(false);
    const r = await call("/api/v1/business-profile", "PUT", { logoUrl: logo, address, city, publicMenuEnabled: pub });
    setBusy(false);
    if (r.error) return setError(r.error);
    setSaved(true); router.refresh();
  }
  async function signOut() {
    await fetch("/api/v1/auth/logout", { method: "POST" }).catch(() => null);
    location.replace("/masuk");
  }
  return <section className="mt-5 grid gap-4 rounded-[2rem] bg-white p-5 sm:p-6">
    <div><h2 className="text-xl font-extrabold">Profil bisnis</h2><p className="text-sm text-stone-600">{initial.name} · ID bisnis <b>{initial.code.slice(0, 4)}-{initial.code.slice(4)}</b></p></div>
    <ImageField kind="logo" label="Logo bisnis" value={logo} onChange={(v) => { setLogo(v); setSaved(false); }} />
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Kota"><input value={city} onChange={(e) => { setCity(e.target.value); setSaved(false); }} maxLength={80} className={input} /></Field>
      <Field label="Alamat lengkap"><input value={address} onChange={(e) => { setAddress(e.target.value); setSaved(false); }} maxLength={300} className={input} placeholder="Jalan, nomor, patokan" /></Field>
    </div>
    <Toggle checked={pub} onChange={(v) => { setPub(v); setSaved(false); }} label="Menu digital bisa dibuka pelanggan" hint="Matikan untuk menutup halaman menu publik dan QR-nya." />
    {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
    {saved ? <p role="status" className="text-sm font-bold text-basil">Tersimpan.</p> : null}
    <div className="flex flex-wrap gap-2">
      <button onClick={save} disabled={busy} className={btnPrimary}>Simpan profil</button>
      <button onClick={signOut} className={`${btnSoft} h-11`}><LogOut aria-hidden className="size-4" />Keluar dari akun</button>
    </div>
  </section>;
}
