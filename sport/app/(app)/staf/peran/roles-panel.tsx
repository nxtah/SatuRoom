"use client";

import { Check, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { PERMISSION_GROUPS, PERMISSION_LABEL } from "@/lib/permission-info";
import { ROLE_INFO } from "../role-fields";
import { grantsOf, type Permission } from "@/server/permissions";
import type { CustomRole } from "@/server/roles";

const input = "h-12 w-full rounded-2xl border-2 border-line bg-white px-4 outline-none focus:border-pitch";

/** Contoh siap pakai supaya pemilik tidak mulai dari kosong. */
const TEMPLATES: { name: string; description: string; permissions: Permission[] }[] = [
  { name: "Asisten pelatih", description: "Membantu absen dan menulis rapor tim yang dipegang.", permissions: ["evaluations.write"] },
  { name: "Admin pendaftaran", description: "Menerima pendaftar dan mengurus data pemain.", permissions: ["players.read_all", "players.manage", "guardians.read", "teams.read_all"] },
  { name: "Kasir iuran", description: "Mencatat pembayaran iuran.", permissions: ["players.read_all", "teams.read_all", "billing.read", "billing.manage"] },
];

export function RolesPanel({ initial, mine }: { initial: CustomRole[]; mine: Permission[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState<Permission[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function open(role?: { id?: string; name: string; description?: string | null; permissions: Permission[] }) {
    setEditing(role?.id ?? "new");
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
    setPerms((role?.permissions ?? []).filter((p) => mine.includes(p)));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setBusy(true);
    setError("");
    const payload = { name, description, permissions: perms };
    const r = editing === "new" ? await api("/roles", { body: payload }) : await api(`/roles/${editing}`, { method: "PUT", body: payload });
    setBusy(false);
    if (!r.ok) return setError(r.error.fields?.name ?? r.error.fields?.permissions ?? r.error.message);
    setEditing(null);
    router.refresh();
  }

  async function archive(role: CustomRole) {
    if (!confirm(`Hapus peran ${role.name}? ${role.members ? `${role.members} staf yang memakainya langsung kehilangan izin dari peran ini.` : ""}`)) return;
    setBusy(true);
    const r = await api(`/roles/${role.id}`, { method: "DELETE" });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  const toggle = (p: Permission) => setPerms(perms.includes(p) ? perms.filter((x) => x !== p) : [...perms, p]);

  return (
    <div className="rise grid gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {editing === null ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => open()}>
            <Plus aria-hidden className="size-5" /> Peran baru
          </Button>
          {TEMPLATES.filter((t) => !initial.some((r) => r.name.toLowerCase() === t.name.toLowerCase())).map((t) => (
            <Button key={t.name} variant="outline" onClick={() => open(t)}>
              Pakai contoh: {t.name}
            </Button>
          ))}
        </div>
      ) : (
        <section className="rounded-[2rem] bg-chalk p-5 sm:p-7" aria-labelledby="form-peran">
          <h2 id="form-peran" className="text-xl font-extrabold">
            {editing === "new" ? "Peran baru" : "Ubah peran"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 font-bold">
              Nama peran
              <input className={input} placeholder="Contoh: Asisten pelatih" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            </label>
            <label className="grid gap-2 font-bold">
              Keterangan <span className="-mt-1 text-sm font-normal text-ink-soft">Boleh dikosongkan</span>
              <input className={input} placeholder="Tugas singkatnya" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={160} />
            </label>
          </div>
          <p className="mt-5 font-bold">Boleh melakukan apa saja?</p>
          <p className="text-sm text-ink-soft">Tanpa izin “semua”, staf hanya melihat tim yang dipegangnya. Izin yang tidak Anda miliki tidak bisa diberikan.</p>
          <div className="mt-3 grid gap-3">
            {PERMISSION_GROUPS.map((g) => {
              const allowed = g.perms.filter((p) => mine.includes(p));
              const all = allowed.length > 0 && allowed.every((p) => perms.includes(p));
              return (
                <fieldset key={g.title} className="rounded-[1.5rem] border-2 border-line bg-white p-3 sm:p-4">
                  <legend className="px-2 font-extrabold">{g.title}</legend>
                  <button
                    type="button"
                    disabled={!allowed.length}
                    onClick={() => setPerms(all ? perms.filter((p) => !allowed.includes(p)) : [...new Set([...perms, ...allowed])])}
                    className="mb-2 h-9 rounded-full bg-mist px-4 text-xs font-bold disabled:opacity-40"
                  >
                    {all ? "Lepas semua" : "Pilih semua"}
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {g.perms.map((p) => {
                      const can = mine.includes(p);
                      const on = perms.includes(p);
                      return (
                        <label key={p} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl p-3 transition ${on ? "bg-turf-soft" : "bg-mist"} ${can ? "" : "cursor-not-allowed opacity-50"}`}>
                          <input type="checkbox" className="peer sr-only" disabled={!can} checked={on} onChange={() => toggle(p)} />
                          <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 border-pitch peer-focus-visible:outline-2 peer-focus-visible:outline-pitch ${on ? "bg-pitch" : ""}`}>
                            {on ? <Check aria-hidden className="size-3.5 text-white" strokeWidth={3} /> : null}
                          </span>
                          <span>
                            <span className="block font-bold">{PERMISSION_LABEL[p].label}</span>
                            <span className="block text-sm text-ink-soft">{PERMISSION_LABEL[p].hint}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={busy || name.trim().length < 2 || perms.length === 0} onClick={save}>
              {busy ? "Menyimpan…" : "Simpan peran"}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
          </div>
        </section>
      )}

      {initial.map((r) => (
        <section key={r.id} className="rounded-[2rem] bg-chalk p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-extrabold">{r.name}</h2>
              {r.description ? <p className="text-sm text-ink-soft">{r.description}</p> : null}
            </div>
            <span className="rounded-full bg-mist px-3 py-1 text-sm font-bold text-ink-soft">{r.members} staf</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {r.permissions.map((p) => (
              <span key={p} className="rounded-full bg-turf-soft px-2.5 py-0.5 text-xs font-bold text-pitch">
                {PERMISSION_LABEL[p].label}
              </span>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => open(r)}>
              <Pencil aria-hidden className="size-4" /> Ubah
            </Button>
            <Button size="sm" variant="danger" disabled={busy} onClick={() => archive(r)}>
              Hapus
            </Button>
          </div>
        </section>
      ))}

      {!initial.length && editing === null ? (
        <p className="rounded-[1.5rem] bg-chalk p-5 text-ink-soft">
          Belum ada peran buatan sendiri. Peran bawaan (Pemilik, Admin, Kepala pelatih, Pelatih, Bendahara) tetap bisa dipakai.
        </p>
      ) : null}

      <details className="rounded-[2rem] bg-chalk p-5">
        <summary className="cursor-pointer text-lg font-extrabold">Isi peran bawaan</summary>
        <div className="mt-4 grid gap-3">
          {ROLE_INFO.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white p-4">
              <p className="font-extrabold">{r.label}</p>
              <p className="text-sm text-ink-soft">{r.hint}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {grantsOf(r.id).map((p) => (
                  <span key={p} className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold text-ink-soft">
                    {PERMISSION_LABEL[p].label}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-sm text-ink-soft">Peran bawaan tidak bisa diubah. Butuh kombinasi lain? Buat peran baru di atas.</p>
        </div>
      </details>
    </div>
  );
}
