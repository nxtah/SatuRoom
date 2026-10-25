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

/** Akun pemain: satu pemain satu akun. Diundang lewat email, bisa diputus. */
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
        Pemain bisa masuk untuk melihat jadwal, mengirim izin atau sakit, kehadiran, dan status iurannya.
      </p>

      {info.account ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-mist px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{info.account.email}</span>
            <span className="block text-sm text-ink-soft">Terhubung sejak {formatDate(info.account.since)}</span>
          </span>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(`/players/${playerId}/account`)}>
            Putuskan
          </Button>
        </div>
      ) : info.pending ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{info.pending.email}</span>
            <span className="block text-sm text-ink-soft">Menunggu diterima, berlaku sampai {formatDate(info.pending.expiresAt)}</span>
          </span>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(`/players/${playerId}/account/invitation`)}>
            Batalkan
          </Button>
        </div>
      ) : null}

      {info.account ? null : (
        <form onSubmit={invite} noValidate className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field
            label={info.pending ? "Kirim ke email lain" : "Email untuk akun pemain"}
            hint="Boleh email orang tua bila pemain belum punya email."
            name="email"
            type="email"
            autoComplete="off"
            error={form.fields.email}
          />
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
