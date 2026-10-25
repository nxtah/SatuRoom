"use client";

import { MailPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { GuardianInviteInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

interface Props {
  playerId: string;
  linked: { userId: string; name: string; email: string }[];
  pending: { id: string; email: string; expiresAt: string }[];
}

/** Akun portal orang tua untuk satu pemain: siapa yang sudah terhubung, undangan, dan undang baru. */
export function GuardianAccounts({ playerId, linked, pending }: Props) {
  const router = useRouter();
  const form = useForm(GuardianInviteInput);
  const [sent, setSent] = useState<string>();
  const [busy, setBusy] = useState<string>();

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const values = formValues(el);
    const r = await form.submit(values, (input) => api(`/players/${playerId}/guardians`, { body: input }));
    if (!r) return;
    setSent(String(values.email));
    el.reset();
    router.refresh();
  }

  async function remove(path: string, key: string) {
    setBusy(key);
    await api(path, { method: "DELETE" });
    setBusy(undefined);
    router.refresh();
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="font-extrabold">Akun portal orang tua</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Orang tua bisa melihat jadwal, mengirim izin atau sakit, kehadiran, dan status iuran anaknya.
      </p>

      {linked.length || pending.length ? (
        <ul className="mt-3 grid gap-2">
          {linked.map((g) => (
            <li key={g.userId} className="flex items-center gap-3 rounded-2xl bg-mist px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{g.name}</span>
                <span className="block truncate text-sm text-ink-soft">{g.email}</span>
              </span>
              <span className="rounded-full bg-turf/15 px-2.5 py-1 text-xs font-bold text-turf">Terhubung</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Putuskan ${g.name}`}
                disabled={busy === g.userId}
                onClick={() => remove(`/players/${playerId}/guardians/${g.userId}`, g.userId)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
          {pending.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
              <span className="min-w-0 flex-1 truncate font-bold">{i.email}</span>
              <span className="rounded-full bg-sun/30 px-2.5 py-1 text-xs font-bold">Menunggu</span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Batalkan undangan ${i.email}`}
                disabled={busy === i.id}
                onClick={() => remove(`/players/${playerId}/guardian-invitations/${i.id}`, i.id)}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={invite} noValidate className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field label="Email orang tua" name="email" type="email" autoComplete="off" error={form.fields.email} />
        <Button type="submit" variant="dark" disabled={form.pending} className="sm:mb-[2px]">
          <MailPlus aria-hidden className="size-4" /> {form.pending ? "Mengirim…" : "Undang"}
        </Button>
      </form>
      {form.error && !form.error.fields ? (
        <div className="mt-3">
          <Alert tone="error">{form.error.message}</Alert>
        </div>
      ) : null}
      {sent && !form.error ? (
        <p role="status" className="mt-3 text-sm font-bold text-turf">
          Undangan terkirim ke {sent}.
        </p>
      ) : null}
    </div>
  );
}
