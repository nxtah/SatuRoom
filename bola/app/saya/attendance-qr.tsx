"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function AttendanceQr() {
  const [src, setSrc] = useState<string>();
  const [error, setError] = useState<string>();
  async function refresh() {
    setError(undefined); const r = await api<{ token: string }>("/me/player/attendance-qr", { method: "POST" });
    if (!r.ok) return setError(r.error.message);
    setSrc(await QRCode.toDataURL(r.data.token, { width: 280, margin: 1, color: { dark: "#0b1a3a", light: "#ffffff" } }));
  }
  useEffect(() => { const first = setTimeout(() => void refresh(), 0); const id = setInterval(() => void refresh(), 90_000); return () => { clearTimeout(first); clearInterval(id); }; }, []);
  return <section className="rounded-[2rem] bg-chalk p-6"><h2 className="font-extrabold">QR absensi</h2><p className="mt-1 text-sm text-ink-soft">Tunjukkan ke pelatih saat latihan. QR berganti otomatis.</p>{src ? <img src={src} alt="QR absensi pemain" className="mt-4 size-56 rounded-2xl border border-line p-3" /> : <p className="mt-4 text-ink-soft">Menyiapkan QR…</p>}{error ? <p className="mt-3 text-sm font-bold text-[#b42318]">{error}</p> : null}<button onClick={() => void refresh()} className="mt-4 rounded-full bg-pitch px-4 py-2 text-sm font-bold text-white">Buat QR baru</button></section>;
}
