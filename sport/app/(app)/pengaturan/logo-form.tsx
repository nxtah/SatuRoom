"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ImageField } from "@/components/image-field";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";

/** Logo tersimpan langsung setelah diunggah atau dihapus. */
export function LogoForm({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(logoUrl);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function save(url: string | null) {
    setMsg(null);
    const r = await api("/academy/logo", { method: "PUT", body: { logoUrl: url } });
    if (!r.ok) return setMsg({ tone: "error", text: r.error.message });
    setValue(url);
    setMsg({ tone: "success", text: url ? "Logo tersimpan." : "Logo dihapus." });
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <ImageField value={value} onChange={save} label="Logo akademi" hint="Tampil di menu, beranda, dan untuk staf. Persegi lebih rapi. JPG, PNG, atau WebP, maks 5 MB." />
      {msg ? <Alert tone={msg.tone}>{msg.text}</Alert> : null}
    </div>
  );
}
