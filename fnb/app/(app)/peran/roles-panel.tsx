"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PERMISSIONS, PERMISSION_LABEL, type Permission } from "@/lib/permissions";
import type { CustomRole } from "@/server/roles";

const field = "h-11 w-full rounded-2xl border border-stone-300 bg-white px-4";

export function RolesPanel({ initial, mine }: { initial: CustomRole[]; mine: Permission[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Permission[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function open(role?: CustomRole) {
    setEditing(role?.id ?? "new"); setName(role?.name ?? ""); setPerms(role?.permissions ?? []); setError("");
  }

  async function call(url: string, method: string, payload?: unknown) {
    setBusy(true); setError("");
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Belum dapat disimpan."); return; }
    setEditing(null); router.refresh();
  }

  const save = () => call(editing === "new" ? "/api/v1/roles" : `/api/v1/roles/${editing}`, editing === "new" ? "POST" : "PUT", { name, permissions: perms });

  return <div className="mt-6 grid gap-3">
    <p aria-live="polite" role={error ? "alert" : undefined} className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 empty:hidden">{error}</p>
    {editing === null ? <button onClick={() => open()} className="h-11 w-fit rounded-full bg-saffron px-6 font-extrabold text-kitchen">+ Peran baru</button> : <section className="rounded-[2rem] bg-white p-5">
      <h2 className="text-xl font-extrabold">{editing === "new" ? "Peran baru" : "Ubah peran"}</h2>
      <input aria-label="Nama peran" className={`${field} mt-3`} placeholder="Contoh: Kasir pagi" value={name} onChange={(e) => setName(e.target.value)} />
      <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-extrabold">Izin</legend>
        {PERMISSIONS.map((p) => <label key={p} className={`flex min-h-11 items-start gap-3 rounded-2xl bg-stone-50 p-3 ${mine.includes(p) ? "" : "opacity-50"}`}>
          <input type="checkbox" className="mt-1 size-5 shrink-0" disabled={!mine.includes(p)} checked={perms.includes(p)} onChange={() => setPerms(perms.includes(p) ? perms.filter((x) => x !== p) : [...perms, p])} />
          <span><span className="block font-bold">{PERMISSION_LABEL[p].label}</span><span className="block text-sm text-stone-600">{PERMISSION_LABEL[p].hint}</span></span>
        </label>)}
      </fieldset>
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busy || name.trim().length < 2 || perms.length === 0} onClick={save} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan peran</button>
        <button onClick={() => setEditing(null)} className="h-11 rounded-full bg-stone-100 px-5 font-bold">Batal</button>
      </div>
    </section>}
    {initial.map((r) => <section key={r.id} className="rounded-[2rem] bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-0 flex-1 truncate text-lg font-extrabold">{r.name}</h2>
        <span className="text-sm text-stone-600">{r.members} staf</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{r.permissions.map((p) => <span key={p} className="rounded-full bg-basil/10 px-3 py-1 text-sm font-bold text-basil">{PERMISSION_LABEL[p].label}</span>)}</div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => open(r)} className="h-11 rounded-full bg-stone-100 px-5 font-bold">Ubah</button>
        <button disabled={busy} onClick={() => confirm(`Arsipkan peran ${r.name}? Izin staf yang memakainya langsung dicabut.`) && call(`/api/v1/roles/${r.id}`, "DELETE")} className="h-11 rounded-full bg-stone-100 px-5 font-bold text-red-700">Arsipkan</button>
      </div>
    </section>)}
    {!initial.length && editing === null ? <p className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700">Belum ada peran custom. Peran bawaan (Kasir, Dapur, Gudang, dan lainnya) tetap bisa dipakai.</p> : null}
  </div>;
}
