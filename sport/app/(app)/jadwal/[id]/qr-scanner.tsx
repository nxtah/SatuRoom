"use client";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function QrScanner({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => { const s = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 240 }, false); s.render(async (token) => { s.clear(); const r = await api<{ fullName: string }>(`/sessions/${sessionId}/attendance/qr`, { method: "POST", body: { token } }); if (r.ok) setResult(`${r.data.fullName} hadir`); else setError(r.error.message); }, () => {}); return () => { void s.clear(); }; }, [sessionId]);
  return <section className="mb-4 rounded-[2rem] bg-chalk p-5"><h2 className="font-extrabold">Scan QR pemain</h2><p className="mb-3 text-sm text-ink-soft">Izinkan kamera, lalu arahkan ke QR dari akun pemain.</p><div id="qr-reader" />{result ? <p className="mt-3 font-bold text-turf">{result}</p> : null}{error ? <p className="mt-3 font-bold text-[#b42318]">{error}</p> : null}</section>;
}
