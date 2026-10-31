"use client";

import { MailPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/age";
import { PlayerInviteInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { PlayerAccountInfo } from "@/server/player-account";

const RELATION = { mother: "Ibu", father: "Ayah", guardian: "Wali", self: "Pemain sendiri" } as const;

/** Akun pemain dan orang tua: maksimal 4 per pemain. Diundang lewat email, bisa diputus satu per satu. */
export function PlayerAccount({ playerId, info }: { playerId: string; info: PlayerAccountInfo }) {
  const router = useRouter();
  const form = useForm(PlayerInviteInput);
  const [busy, setBusy] = useState(false);

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const r = await form.submit(formValues(el), (input) => api(`/players/${playerId}/account`, { body: input }));
    if (!r) return;
    el.reset();
    router.refresh();
  }

  async function remove(path: string) {
    setBusy(true);
    await api(path, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="rise rounded-[2rem] bg-chalk p-6" aria-labelledby="akun">
      <h2 id="akun" className="font-extrabold">
        Akun pemain
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Pemain atau orang tua bisa masuk untuk melihat jadwal, mengirim izin atau sakit, kehadiran, dan status iurannya.
      </p>

      <ul className="mt-4 grid gap-2">
        {info.accounts.map((a) => (
          <li key={a.userId} className="flex flex-wrap items-center gap-3 rounded-2xl bg-mist px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{a.name} <span className="font-normal text-ink-soft">· {RELATION[a.relation]}</span></span>
              <span className="block truncate text-sm text-ink-soft">{a.email} · sejak {formatDate(a.since)}</span>
            </span>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => confirm(`Putuskan akun ${a.email} dari pemain ini?`) && remove(`/players/${playerId}/account?user=${a.userId}`)}>
              Putuskan
            </Button>
          </li>
        ))}
        {info.pending.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold">{p.email} <span className="font-normal text-ink-soft">· {RELATION[p.relation]}</span></span>
              <span className="block text-sm text-ink-soft">Menunggu diterima, berlaku sampai {formatDate(p.expiresAt)}</span>
            </span>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(`/players/${playerId}/account/invitation?id=${p.id}`)}>
              Batalkan
            </Button>
          </li>
        ))}
      </ul>

      {info.accounts.length + info.pending.length >= 4 ? (
        <p className="mt-3 text-sm text-ink-soft">Sudah 4 akun. Putuskan salah satu untuk mengundang yang lain.</p>
      ) : (
        <form onSubmit={invite} noValidate className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
          <Field
            label={info.accounts.length ? "Undang akun lain" : "Email untuk akun pemain"}
            hint="Ayah dan ibu bisa punya akun masing-masing. Satu akun orang tua bisa memegang beberapa anak."
            name="email"
            type="email"
            autoComplete="off"
            error={form.fields.email}
          />
          <label className="grid gap-2 text-sm font-bold sm:mb-7">
            Sebagai
            <select name="relation" defaultValue="guardian" className="h-12 rounded-2xl border-2 border-line bg-white px-3 outline-none focus:border-pitch">
              {Object.entries(RELATION).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="dark" disabled={form.pending} className="sm:mb-7">
            <MailPlus aria-hidden className="size-4" /> {form.pending ? "Mengirim…" : "Undang"}
          </Button>
        </form>
      )}
      {form.error && !form.error.fields ? (
        <div className="mt-3">
          <Alert tone="error">{form.error.message}</Alert>
        </div>
      ) : null}
    </section>
  );
}
