"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BUILTIN_ROLES, ROLE_LABEL, type BuiltinRole } from "@/lib/permissions";
import type { StaffMember } from "@/server/staff";

const chip = "inline-flex h-11 items-center rounded-full bg-stone-100 px-4 text-sm font-bold";

export function StaffPanel({ initial, invites, customRoles, selfId, isOwner }: {
  initial: StaffMember[]; invites: { id: string; email: string; roles: BuiltinRole[]; customRoles: string[]; expiresAt: string }[]; customRoles: { id: string; name: string }[]; selfId: string; isOwner: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [roles, setRoles] = useState<BuiltinRole[]>([]);
  const [custom, setCustom] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<BuiltinRole[]>([]);
  const [inviteCustom, setInviteCustom] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  async function invite() {
    setBusy(true); setError(""); setNotice("");
    const res = await fetch("/api/v1/staff/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, roles: inviteRoles, customRoleIds: inviteCustom }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Undangan belum terkirim.");
    setNotice(data.emailSent ? `Undangan dikirim ke ${email}.` : `Undangan untuk ${email} tersimpan, tapi email belum terkirim. Minta orangnya daftar atau masuk dengan email itu, lalu buka halaman Undangan.`);
    setEmail(""); setInviteRoles([]); setInviteCustom([]); router.refresh();
  }

  async function revoke(id: string) {
    setBusy(true); setError("");
    const res = await fetch(`/api/v1/invitations/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat dicabut.");
    router.refresh();
  }

  const pickable = BUILTIN_ROLES.filter((r) => isOwner || r !== "owner");
  const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function edit(m: StaffMember) {
    setEditing(m.membershipId); setRoles(m.roles); setCustom(m.customRoles.map((c) => c.id)); setError("");
  }

  async function send(url: string, payload: unknown) {
    setBusy(true); setError("");
    const res = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Belum dapat disimpan."); return false; }
    setEditing(null); router.refresh();
    return true;
  }

  return <div className="mt-6 grid gap-3">
    <p aria-live="polite" role={error ? "alert" : undefined} className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 empty:hidden">{error}</p>
    <section className="rounded-[2rem] bg-white p-5">
      <h2 className="text-xl font-extrabold">Undang staf</h2>
      <p className="mt-1 text-sm text-stone-600">Penerima membuat password sendiri lewat link di email. Undangan berlaku 14 hari.</p>
      <input aria-label="Email staf" type="email" className="mt-3 h-11 w-full rounded-2xl border border-stone-300 bg-white px-4" placeholder="email@contoh.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        {pickable.map((r) => <label key={r} className={`${chip} cursor-pointer ${inviteRoles.includes(r) ? "bg-saffron text-kitchen" : ""}`}><input type="checkbox" className="sr-only" checked={inviteRoles.includes(r)} onChange={() => setInviteRoles(toggle(inviteRoles, r))} />{ROLE_LABEL[r]}</label>)}
        {customRoles.map((c) => <label key={c.id} className={`${chip} cursor-pointer ${inviteCustom.includes(c.id) ? "bg-saffron text-kitchen" : ""}`}><input type="checkbox" className="sr-only" checked={inviteCustom.includes(c.id)} onChange={() => setInviteCustom(toggle(inviteCustom, c.id))} />{c.name}</label>)}
      </div>
      <button disabled={busy || !email || inviteRoles.length + inviteCustom.length === 0} onClick={invite} className="mt-4 h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Kirim undangan</button>
      <p aria-live="polite" className="mt-3 rounded-2xl bg-basil/10 p-3 text-sm font-bold text-basil empty:hidden">{notice}</p>
    </section>
    {invites.length ? <section className="rounded-[2rem] bg-white p-5">
      <h2 className="text-xl font-extrabold">Menunggu diterima</h2>
      <ul className="mt-3 grid gap-2">{invites.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-stone-50 p-3">
        <span className="min-w-0 flex-1"><span className="block truncate font-bold">{i.email}</span><span className="block text-sm text-stone-600">{[...i.roles.map((r) => ROLE_LABEL[r]), ...i.customRoles].join(", ")}</span></span>
        <button disabled={busy} onClick={() => revoke(i.id)} className={chip}>Cabut</button>
      </li>)}</ul>
    </section> : null}
    {initial.map((m) => <section key={m.membershipId} className="rounded-[2rem] bg-white p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-extrabold">{m.name}{m.membershipId === selfId ? " (Anda)" : ""}</h2>
          <p className="truncate text-sm text-stone-600">{m.email}</p>
        </div>
        {m.status === "suspended" ? <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-700">Nonaktif</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {m.roles.map((r) => <span key={r} className="rounded-full bg-basil/10 px-3 py-1 text-sm font-bold text-basil">{ROLE_LABEL[r]}</span>)}
        {m.customRoles.map((c) => <span key={c.id} className="rounded-full bg-saffron/40 px-3 py-1 text-sm font-bold">{c.name}</span>)}
      </div>
      {editing === m.membershipId ? <div className="mt-4 grid gap-3 rounded-2xl bg-stone-50 p-4">
        <fieldset className="grid gap-2"><legend className="text-sm font-extrabold">Peran bawaan</legend>
          <div className="flex flex-wrap gap-2">{pickable.map((r) => <label key={r} className={`${chip} cursor-pointer gap-2 ${roles.includes(r) ? "bg-saffron text-kitchen" : ""}`}>
            <input type="checkbox" className="sr-only" checked={roles.includes(r)} onChange={() => setRoles(toggle(roles, r))} />{ROLE_LABEL[r]}
          </label>)}</div>
        </fieldset>
        {customRoles.length ? <fieldset className="grid gap-2"><legend className="text-sm font-extrabold">Peran custom</legend>
          <div className="flex flex-wrap gap-2">{customRoles.map((c) => <label key={c.id} className={`${chip} cursor-pointer gap-2 ${custom.includes(c.id) ? "bg-saffron text-kitchen" : ""}`}>
            <input type="checkbox" className="sr-only" checked={custom.includes(c.id)} onChange={() => setCustom(toggle(custom, c.id))} />{c.name}
          </label>)}</div>
        </fieldset> : null}
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || roles.length + custom.length === 0} onClick={() => send(`/api/v1/staff/${m.membershipId}`, { roles, customRoleIds: custom })} className="h-11 rounded-full bg-saffron px-6 font-extrabold text-kitchen disabled:opacity-40">Simpan peran</button>
          <button onClick={() => setEditing(null)} className={chip}>Batal</button>
        </div>
      </div> : <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => edit(m)} className={chip}>Ubah peran</button>
        {m.membershipId !== selfId ? <button disabled={busy} onClick={() => send(`/api/v1/staff/${m.membershipId}/status`, { status: m.status === "active" ? "suspended" : "active" })} className={chip}>{m.status === "active" ? "Nonaktifkan" : "Aktifkan lagi"}</button> : null}
      </div>}
    </section>)}
  </div>;
}
