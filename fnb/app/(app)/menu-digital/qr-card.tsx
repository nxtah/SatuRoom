"use client";
import Link from "next/link";
import { useState } from "react";
import { btnPrimary, btnSoft } from "@/components/ui";

export function QrCard({ name, city, url, qr, enabled }: { name: string; city: string | null; url: string; qr: string; enabled: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(url).catch(() => null);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <style>{`@media print { body * { visibility: hidden } #kartu-qr, #kartu-qr * { visibility: visible } #kartu-qr { position: absolute; inset: 0; margin: auto; box-shadow: none } }`}</style>
    <section className="grid content-start gap-4 rounded-[2rem] bg-white p-5 sm:p-6 print:hidden">
      {!enabled ? <p role="alert" className="rounded-2xl bg-saffron/25 p-3 text-sm font-bold">Menu digital sedang dimatikan, jadi pelanggan yang memindai melihat pesan tidak ditemukan. Nyalakan di <Link href="/pengaturan" className="underline">Pengaturan</Link>.</p> : null}
      <div><p className="text-sm font-bold text-stone-600">Alamat menu</p><p className="mt-1 rounded-2xl bg-cream p-3 font-mono text-sm break-all">{url}</p></div>
      <div className="flex flex-wrap gap-2">
        <button onClick={copy} className={btnPrimary}>{copied ? "Tersalin" : "Salin tautan"}</button>
        <a href={qr} download={`qr-menu-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`} className={`${btnSoft} h-11`}>Unduh QR (PNG)</a>
        <button onClick={() => window.print()} className={`${btnSoft} h-11`}>Cetak kartu meja</button>
        <a href={url} target="_blank" rel="noreferrer" className={`${btnSoft} h-11`}>Lihat sebagai pelanggan</a>
      </div>
      <ul className="grid gap-1.5 text-sm text-stone-600">
        <li>Tempel kartu di meja, kasir, atau pintu. Satu QR berlaku selamanya selama ID bisnis tidak berubah.</li>
        <li>Menu yang disembunyikan dari kasir, kategori nonaktif, dan menu terarsip tidak tampil ke pelanggan.</li>
        <li>Halaman ini hanya untuk melihat menu. Pemesanan tetap lewat kasir atau pelayan.</li>
      </ul>
    </section>
    <section className="min-w-0 rounded-[2rem] bg-plate p-4 print:bg-white print:p-0">
      <div id="kartu-qr" className="mx-auto max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-bold text-tomato">Lihat menu kami</p>
        <h2 className="mt-1 text-2xl font-extrabold break-words">{name}</h2>
        {city ? <p className="text-sm text-stone-600">{city}</p> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR menu ${name}`} className="mx-auto mt-4 aspect-square w-full max-w-72" />
        <p className="mt-3 text-sm font-bold">Pindai dengan kamera HP</p>
        <p className="text-xs text-stone-500">Tanpa aplikasi, tanpa login</p>
      </div>
    </section>
  </div>;
}
