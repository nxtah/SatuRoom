"use client";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { thumb } from "@/lib/images";

const MAX = 5 * 1024 * 1024;

/** Unggah gambar langsung ke Cloudinary dengan tanda tangan dari server. Mengembalikan URL aman lewat onChange. */
export function ImageField({ value, onChange, kind, label = "Gambar" }: { value: string | null; onChange: (url: string | null) => void; kind: "menu" | "kategori" | "addon" | "struk"; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Pakai gambar JPG, PNG, atau WebP.");
    if (file.size > MAX) return setError("Ukuran gambar maksimal 5 MB.");
    setBusy(true);
    try {
      const signRes = await fetch("/api/v1/uploads/sign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind }) });
      const sign = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(sign.error ?? "Upload belum bisa dipakai.");
      const form = new FormData();
      form.set("file", file);
      form.set("api_key", sign.apiKey);
      form.set("timestamp", String(sign.timestamp));
      form.set("folder", sign.folder);
      form.set("allowed_formats", sign.allowedFormats);
      form.set("signature", sign.signature);
      const up = await fetch(sign.uploadUrl, { method: "POST", body: form });
      const data = await up.json().catch(() => ({}));
      if (!up.ok || !data.secure_url) throw new Error(data.error?.message ?? "Gambar gagal diunggah.");
      onChange(data.secure_url);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const preview = thumb(value, 240);
  return (
    <div>
      <span className="text-sm font-bold">{label}</span>
      <div className="mt-1 flex items-center gap-3">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-cream text-stone-400">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus aria-hidden className="size-7" />}
        </div>
        <div className="grid gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="h-10 rounded-full bg-kitchen px-4 text-sm font-bold text-white disabled:opacity-60">
            {busy ? "Mengunggah..." : value ? "Ganti gambar" : "Pilih gambar"}
          </button>
          {value ? <button type="button" onClick={() => onChange(null)} className="inline-flex h-9 items-center gap-1 text-sm font-bold text-tomato"><Trash2 aria-hidden className="size-4" />Hapus gambar</button> : null}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={label} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error ? <p role="alert" className="mt-1 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
