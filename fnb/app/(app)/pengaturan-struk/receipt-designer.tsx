"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReceiptView } from "@/components/receipt-view";
import { btnPrimary, call, Field, input, Toggle } from "@/components/ui";
import { ImageField } from "@/components/image-field";
import type { Receipt } from "@/server/receipt";
import type { ReceiptTemplate } from "@/server/receipt-template";

export function ReceiptDesigner({ initial, sample }: { initial: ReceiptTemplate; sample: Omit<Receipt, "template" | "header" | "footer" | "paper"> }) {
  const router = useRouter();
  const [t, setT] = useState(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ReceiptTemplate>(k: K, v: ReceiptTemplate[K]) => { setT({ ...t, [k]: v }); setSaved(false); };

  async function save() {
    setBusy(true); setError("");
    const r = await call("/api/v1/receipt-template", "PUT", t);
    setBusy(false);
    if (r.error) return setError(r.error);
    setSaved(true); router.refresh();
  }
  return <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <section className="grid content-start gap-4 rounded-[2rem] bg-white p-5">
      <ImageField kind="struk" label="Logo di bagian atas struk" value={t.logoUrl} onChange={(v) => set("logoUrl", v)} />
      <Field label="Lebar kertas"><select value={t.paper} onChange={(e) => set("paper", Number(e.target.value) as 58 | 80)} className={input}><option value={80}>80 mm (umum)</option><option value={58}>58 mm (kecil)</option></select></Field>
      <Field label="Teks di atas (alamat, telepon)"><input value={t.header ?? ""} maxLength={200} onChange={(e) => set("header", e.target.value)} className={input} /></Field>
      <Field label="Teks di bawah (terima kasih, wifi)"><input value={t.footer ?? ""} maxLength={200} onChange={(e) => set("footer", e.target.value)} className={input} /></Field>
      <div className="grid gap-1">
        <Toggle checked={t.showCashier} onChange={(v) => set("showCashier", v)} label="Tampilkan nama kasir" />
        <Toggle checked={t.showTable} onChange={(v) => set("showTable", v)} label="Tampilkan meja" />
        <Toggle checked={t.showCustomer} onChange={(v) => set("showCustomer", v)} label="Tampilkan nama pelanggan" />
        <Toggle checked={t.showTaxDetail} onChange={(v) => set("showTaxDetail", v)} label="Rinci pajak dan service charge" hint="Jika mati, keduanya digabung dalam satu baris." />
        <Toggle checked={t.showPayment} onChange={(v) => set("showPayment", v)} label="Tampilkan rincian pembayaran" />
      </div>
      {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
      {saved ? <p role="status" className="text-sm font-bold text-basil">Tersimpan. Berlaku untuk struk berikutnya dan cetak ulang.</p> : null}
      <button onClick={save} disabled={busy} className={btnPrimary}>Simpan tampilan struk</button>
    </section>
    <section aria-label="Pratinjau struk" className="min-w-0 rounded-[2rem] bg-plate p-4"><ReceiptView receipt={{ ...sample, template: t, header: t.header, footer: t.footer, paper: t.paper }} /></section>
  </div>;
}
