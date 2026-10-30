"use client";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

export const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
export const input = "h-11 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3";
export const btnPrimary = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-kitchen px-5 font-bold text-white disabled:opacity-60";
export const btnAccent = "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-saffron px-5 font-extrabold text-kitchen disabled:opacity-60";
export const btnSoft = "inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-stone-100 px-4 text-sm font-bold disabled:opacity-60";

/** Panggilan API JSON; mengembalikan pesan galat siap tampil, atau null jika berhasil. */
export async function call(url: string, method: string, payload?: unknown): Promise<{ error: string | null; data: unknown }> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload) }).catch(() => null);
  if (!res) return { error: "Koneksi terputus. Coba lagi.", data: null };
  const data = await res.json().catch(() => ({}));
  return { error: res.ok ? null : ((data as { error?: string }).error ?? "Belum dapat disimpan."), data };
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid content-start gap-1 text-sm font-bold ${className}`}>
      {label}
      {children}
      {hint ? <span className="text-xs font-normal text-stone-500">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl bg-stone-50 px-3 py-2">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-basil" />
      <span className="grid text-sm"><b>{label}</b>{hint ? <span className="text-xs text-stone-500">{hint}</span> : null}</span>
    </label>
  );
}

/** Dialog bawaan browser: fokus terkunci, Esc menutup, dan layar pembaca mengenalinya. */
export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }} className={`m-auto max-h-[92dvh] w-[calc(100vw-1.5rem)] overflow-hidden rounded-[2rem] bg-plate p-0 text-ink shadow-2xl backdrop:bg-black/50 ${wide ? "max-w-3xl" : "max-w-lg"}`}>
      {open ? (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center gap-3 border-b border-stone-200 px-5 py-4">
            <h2 className="flex-1 text-xl font-extrabold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid size-10 place-items-center rounded-full bg-white"><X aria-hidden className="size-5" /></button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}

export function PageHead({ kicker, title, children, action }: { kicker: string; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-tomato">{kicker}</p>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {children ? <p className="mt-2 max-w-2xl text-stone-600">{children}</p> : null}
      </div>
      {action}
    </div>
  );
}
