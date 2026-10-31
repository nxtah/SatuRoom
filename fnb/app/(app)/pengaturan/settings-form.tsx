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
  const [kitchen, setKitchen] = useState(initial.kitchenEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setError(""); setSaved(false);
    const res = await fetch("/api/v1/settings", {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...v, taxPercent: Number(v.taxPercent || 0), servicePercent: Number(v.servicePercent || 0), receiptHeader: v.receiptHeader || null, receiptFooter: v.receiptFooter || null, kitchenEnabled: kitchen }),
    }).catch(() => null);
    setBusy(false);
    if (!res) return setError("Koneksi terputus. Coba lagi.");
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat disimpan.");
    setSaved(true); router.refresh();
  }

  const flows = [
    { on: true, title: "Lewat dapur", text: "Pesanan masuk ke layar Dapur dulu. Dapur menandai Dimasak lalu Siap, baru disajikan. Cocok untuk restoran dan kafe dengan dapur." },
    { on: false, title: "Langsung disajikan", text: "Tanpa layar Dapur. Pesanan baru langsung berstatus Disajikan, kasir tinggal menerima pembayaran. Cocok untuk kedai kecil, minuman, atau jual cepat." },
  ];
  return <section className="mt-6 grid gap-4 rounded-[2rem] bg-white p-6">
    <fieldset className="grid gap-2">
      <legend className="font-bold">Alur pesanan</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {flows.map((f) => <label key={f.title} className={`grid cursor-pointer gap-1 rounded-2xl border-2 p-4 ${kitchen === f.on ? "border-saffron bg-saffron/10" : "border-stone-200"}`}>
          <span className="flex items-center gap-2 font-extrabold"><input type="radio" name="alur" checked={kitchen === f.on} onChange={() => { setKitchen(f.on); setSaved(false); }} className="size-5 accent-kitchen" />{f.title}</span>
          <span className="text-sm text-stone-600">{f.text}</span>
        </label>)}
      </div>
      <p className="text-xs text-stone-500">Berlaku untuk pesanan berikutnya. Pesanan yang sudah masuk dapur tetap bisa diselesaikan.</p>
    </fieldset>
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
