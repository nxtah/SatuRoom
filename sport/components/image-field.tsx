"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { uploadImage } from "@/lib/upload";
import { thumb } from "@/lib/images";
import { Img } from "./img";

const MAX = 5 * 1024 * 1024;


/** Unggah gambar langsung ke Cloudinary dengan tanda tangan dari server. URL hasil dikirim lewat onChange. */
export function ImageField({ value, onChange, label = "Logo", hint, kind = "logo" }: { value: string | null; onChange: (url: string | null) => void; label?: string; hint?: string; kind?: "logo" | "item" }) {
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
      onChange(await uploadImage(file, kind));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  const preview = thumb(value, 240);
  return (
    <div>
      <span className="font-bold">{label}</span>
      {hint ? <p className="mt-1 text-sm text-ink-soft">{hint}</p> : null}
      <div className="mt-2 flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-line bg-mist text-ink-soft">
          {preview ? <Img src={preview} className="size-full bg-white object-cover" /> : <ImagePlus aria-hidden className="size-8" />}
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="h-11 rounded-full bg-pitch px-5 text-sm font-bold text-white transition hover:bg-pitch-2 disabled:opacity-60"
          >
            {busy ? "Mengunggah…" : value ? "Ganti logo" : "Pilih logo"}
          </button>
          {value ? (
            <button type="button" onClick={() => onChange(null)} className="inline-flex h-9 items-center gap-1.5 text-sm font-bold text-[#b42318]">
              <Trash2 aria-hidden className="size-4" /> Hapus logo
            </button>
          ) : null}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={label} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-[#b42318]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
