"use client";

import { api } from "./api";

interface Sign {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
}

/** Unggah langsung ke Cloudinary dengan tanda tangan dari server. Mengembalikan URL gambar. */
export async function uploadImage(file: Blob, kind: "logo" | "clock" | "item"): Promise<string> {
  const sign = await api<Sign>("/uploads/sign", { body: { kind } });
  if (!sign.ok) throw new Error(sign.error.message);
  const form = new FormData();
  form.set("file", file);
  form.set("api_key", sign.data.apiKey);
  form.set("timestamp", String(sign.data.timestamp));
  form.set("folder", sign.data.folder);
  form.set("allowed_formats", sign.data.allowedFormats);
  form.set("signature", sign.data.signature);
  const up = await fetch(sign.data.uploadUrl, { method: "POST", body: form });
  const data = await up.json().catch(() => ({}));
  if (!up.ok || !data.secure_url) throw new Error(data.error?.message ?? "Gambar gagal diunggah. Coba lagi.");
  return data.secure_url as string;
}
