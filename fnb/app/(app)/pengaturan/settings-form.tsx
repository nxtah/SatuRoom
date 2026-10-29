"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Settings } from "@/server/settings";

const field = "h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3";

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [v, setV] = useState({
    taxPercent: String(initial.taxPercent), servicePercent: String(initial.servicePercent), receiptPrefix: initial.receiptPrefix,
    receiptHeader: initial.receiptHeader ?? "", receiptFooter: initial.receiptFooter ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setError(""); setSaved(false);
    const res = await fetch("/api/v1/settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...v, taxPercent: Number(v.taxPercent || 0), servicePercent: Number(v.servicePercent || 0), receiptHeader: v.receiptHeader || null, receiptFooter: v.receiptFooter || null }),
    }).catch(() => null);
    setBusy(false);
    if (!res) return setError("Koneksi terputus. Coba lagi.");
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat disimpan.");
    setSaved(true); router.refresh();
  }

  return <section className="mt-6 grid gap-4 rounded-[2rem] bg-white p-6">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 font-bold">Pajak (%)<input type="number" min="0" max="100" step="0.01" className={field} value={v.taxPercent} onChange={(e) => setV({ ...v, taxPercent: e.target.value })} /><span className="text-sm font-normal text-stone-600">Dihitung dari harga setelah diskon ditambah service charge. Isi 0 bila tidak ada.</span></label>
      <label className="grid gap-1 font-bold">Service charge (%)<input type="number" min="0" max="100" step="0.01" className={field} value={v.servicePercent} onChange={(e) => setV({ ...v, servicePercent: e.target.value })} /><span className="text-sm font-normal text-stone-600">Dihitung dari harga setelah diskon.</span></label>
      <label className="grid gap-1 font-bold">Awalan nomor struk<input className={field} maxLength={8} value={v.receiptPrefix} onChange={(e) => setV({ ...v, receiptPrefix: e.target.value.toUpperCase() })} /><span className="text-sm font-normal text-stone-600">Contoh hasil: {v.receiptPrefix || "INV"}-261030-0001. Nomor naik otomatis tiap hari.</span></label>
    </div>
    <label className="grid gap-1 font-bold">Teks di atas struk<input className={field} maxLength={200} value={v.receiptHeader} onChange={(e) => setV({ ...v, receiptHeader: e.target.value })} placeholder="Alamat atau nomor telepon" /></label>
    <label className="grid gap-1 font-bold">Teks di bawah struk<input className={field} maxLength={200} value={v.receiptFooter} onChange={(e) => setV({ ...v, receiptFooter: e.target.value })} placeholder="Terima kasih sudah mampir" /></label>
    <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 empty:hidden">{error}</p>
    {saved ? <p className="rounded-2xl bg-basil/10 p-3 text-sm font-bold text-basil">Pengaturan disimpan.</p> : null}
    <button onClick={save} disabled={busy} className="h-12 w-fit rounded-full bg-saffron px-8 font-extrabold text-kitchen disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan"}</button>
  </section>;
}
