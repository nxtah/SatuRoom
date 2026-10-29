"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Voucher } from "@/server/promos";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const field = "h-11 min-w-0 rounded-xl border border-stone-300 bg-white px-3";

export function VoucherPanel({ initial }: { initial: Voucher[] }) {
  const router = useRouter();
  const [v, setV] = useState({ code: "", kind: "percent", value: "", minSpend: "", maxUses: "", startsOn: "", endsOn: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true); setError("");
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    setBusy(false);
    if (!res) { setError("Koneksi terputus. Coba lagi."); return false; }
    if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat disimpan."); return false; }
    router.refresh();
    return true;
  }

  return <div className="mt-6 grid gap-4">
    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-xl font-extrabold">Buat voucher</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <input aria-label="Kode" className={field} placeholder="Kode, mis. HEMAT10" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} />
        <div className="grid grid-cols-[7rem_1fr] gap-2">
          <select aria-label="Jenis" className={field} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}><option value="percent">Persen</option><option value="amount">Rupiah</option></select>
          <input aria-label="Nilai" className={field} type="number" min="1" placeholder={v.kind === "percent" ? "Mis. 10" : "Mis. 5000"} value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} />
        </div>
        <input aria-label="Minimal belanja" className={field} type="number" min="0" placeholder="Minimal belanja (opsional)" value={v.minSpend} onChange={(e) => setV({ ...v, minSpend: e.target.value })} />
        <input aria-label="Kuota" className={field} type="number" min="1" placeholder="Kuota pemakaian (kosong = tanpa batas)" value={v.maxUses} onChange={(e) => setV({ ...v, maxUses: e.target.value })} />
        <label className="grid gap-1 text-sm font-bold">Berlaku mulai<input aria-label="Mulai" className={field} type="date" value={v.startsOn} onChange={(e) => setV({ ...v, startsOn: e.target.value })} /></label>
        <label className="grid gap-1 text-sm font-bold">Berlaku sampai<input aria-label="Sampai" className={field} type="date" value={v.endsOn} onChange={(e) => setV({ ...v, endsOn: e.target.value })} /></label>
      </div>
      <p role="alert" className="mt-3 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 empty:hidden">{error}</p>
      <button disabled={busy || v.code.trim().length < 3 || !v.value} onClick={async () => { if (await call("/api/v1/vouchers", "POST", { code: v.code, kind: v.kind, value: Number(v.value), minSpend: Number(v.minSpend || 0), maxUses: v.maxUses ? Number(v.maxUses) : null, startsOn: v.startsOn || null, endsOn: v.endsOn || null })) setV({ code: "", kind: "percent", value: "", minSpend: "", maxUses: "", startsOn: "", endsOn: "" }); }} className="mt-4 h-12 rounded-full bg-saffron px-8 font-extrabold text-kitchen disabled:opacity-40">Simpan voucher</button>
    </section>
    <ul className="grid gap-2">
      {initial.map((x) => <li key={x.id} className="rounded-[1.5rem] bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <b className="font-mono">{x.code}</b>
          <span className="rounded-full bg-saffron/25 px-2.5 py-0.5 text-xs font-bold text-kitchen">{x.kind === "percent" ? `${x.value}%` : rupiah(x.value)}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${x.active ? "bg-basil/10 text-basil" : "bg-stone-100 text-stone-600"}`}>{x.active ? "Aktif" : "Nonaktif"}</span>
          <span className="ml-auto text-sm text-stone-600">Dipakai {x.usedCount}{x.maxUses ? ` dari ${x.maxUses}` : "x"}</span>
        </div>
        <p className="mt-1 text-xs text-stone-600">{x.minSpend ? `Min. belanja ${rupiah(x.minSpend)}` : "Tanpa minimal belanja"}{x.startsOn || x.endsOn ? ` · ${x.startsOn ?? "…"} s/d ${x.endsOn ?? "…"}` : ""}</p>
        <div className="mt-2 flex gap-2">
          <button disabled={busy} onClick={() => call(`/api/v1/vouchers/${x.id}`, "PATCH", { active: !x.active })} className="h-9 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700">{x.active ? "Nonaktifkan" : "Aktifkan"}</button>
          <button disabled={busy} onClick={() => confirm(`Hapus voucher ${x.code}?`) && call(`/api/v1/vouchers/${x.id}`, "DELETE")} className="h-9 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700">Hapus</button>
        </div>
      </li>)}
      {!initial.length ? <li className="rounded-[2rem] bg-white p-10 text-center text-stone-600">Belum ada voucher.</li> : null}
    </ul>
  </div>;
}
