"use client";

import { Camera, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/upload";

export interface ClockShot {
  photoUrl: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

function position(): Promise<GeolocationPosition | null> {
  return new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  });
}

/**
 * Kamera selfie untuk absen kerja. Foto diberi cap: nama akademi, nama staf, jenis absen, tanggal dan jam,
 * serta koordinat lokasi, lalu diunggah ke Cloudinary.
 */
export function CameraClock({ academy, person, label, onDone, onCancel }: { academy: string; person: string; label: string; onDone: (s: ClockShot) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string; pos: GeolocationPosition | null } | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [loc, setLoc] = useState<GeolocationPosition | null>(null);

  useEffect(() => {
    let off = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }, audio: false })
      .then((s) => {
        if (off) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setError("Kamera tidak bisa dibuka. Izinkan akses kamera di browser, lalu coba lagi."));
    position().then((p) => !off && setLoc(p));
    return () => {
      off = true;
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const g = c.getContext("2d")!;
    g.translate(c.width, 0);
    g.scale(-1, 1);
    g.drawImage(v, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const pos = loc ?? (await position());
    const now = new Date();
    const lines = [
      academy,
      `${person} · ${label}`,
      now.toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      pos ? `Lokasi ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)} m)` : "Lokasi tidak tersedia",
    ];
    const fs = Math.max(16, Math.round(c.width / 28));
    const pad = Math.round(fs * 0.6);
    const h = lines.length * fs * 1.3 + pad * 2;
    g.fillStyle = "rgba(11,26,58,0.72)";
    g.fillRect(0, c.height - h, c.width, h);
    g.fillStyle = "#fff";
    g.textBaseline = "top";
    lines.forEach((t, i) => {
      g.font = `${i === 0 ? "800" : "600"} ${fs}px Arial, sans-serif`;
      g.fillText(t, pad, c.height - h + pad + i * fs * 1.3, c.width - pad * 2);
    });
    c.toBlob((blob) => blob && setShot({ blob, url: URL.createObjectURL(blob), pos }), "image/jpeg", 0.85);
  }

  async function send() {
    if (!shot) return;
    setBusy(true);
    setError(undefined);
    try {
      const photoUrl = await uploadImage(shot.blob, "clock");
      onDone({ photoUrl, lat: shot.pos?.coords.latitude ?? null, lng: shot.pos?.coords.longitude ?? null, accuracy: shot.pos?.coords.accuracy ?? null });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={`Foto ${label}`} className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4">
      <div className="grid w-full max-w-md gap-3 rounded-[2rem] bg-chalk p-4 text-ink">
        <div className="flex items-center justify-between">
          <p className="font-extrabold">Foto {label}</p>
          <button type="button" aria-label="Tutup" onClick={onCancel} className="rounded-full p-2 hover:bg-mist"><X aria-hidden className="size-5" /></button>
        </div>
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink">
          {shot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shot.url} alt="Hasil foto" className="size-full object-cover" />
          ) : (
            <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
          )}
        </div>
        <p className="text-xs text-ink-soft">{loc ? `Lokasi terbaca (±${Math.round(loc.coords.accuracy)} m).` : "Mencari lokasi… Izinkan akses lokasi supaya tercatat."}</p>
        {error ? <p className="text-sm font-bold text-flame">{error}</p> : null}
        {shot ? (
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={send}>{busy ? "Mengirim…" : `Kirim ${label}`}</Button>
            <Button variant="ghost" disabled={busy} onClick={() => { URL.revokeObjectURL(shot.url); setShot(null); }}><RotateCcw aria-hidden className="size-4" /> Ulangi</Button>
          </div>
        ) : (
          <Button size="lg" disabled={Boolean(error)} onClick={capture}><Camera aria-hidden className="size-5" /> Ambil foto</Button>
        )}
      </div>
    </div>
  );
}
