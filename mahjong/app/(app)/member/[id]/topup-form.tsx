"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { TopUpInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

export function TopUpForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const form = useForm(TopUpInput);
  const [method, setMethod] = useState("cash");
  const [done, setDone] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(false);
    const el = e.currentTarget;
    const ok = await form.submit({ ...formValues(el), method }, (input) => api(`/members/${memberId}/topup`, { body: input }));
    if (!ok) return;
    el.reset();
    setDone(true);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} noValidate className="tile rise grid gap-4 p-5" aria-label="Isi saldo">
      <h2 className="text-lg font-extrabold">Isi saldo</h2>
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      {done ? <Alert tone="success">Saldo bertambah.</Alert> : null}
      <Field label="Nominal (Rp)" name="amount" inputMode="numeric" placeholder="200000" error={form.fields.amount} />
      <div className="flex gap-2" role="radiogroup" aria-label="Cara bayar">
        {[["cash", "Tunai"], ["qris", "QRIS"], ["transfer", "Transfer"]].map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={method === v} onClick={() => setMethod(v!)} className={`h-11 flex-1 rounded-xl border-2 font-bold ${method === v ? "border-pitch bg-pitch text-white" : "border-line bg-chalk"}`}>{l}</button>
        ))}
      </div>
      <Button type="submit" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Tambah saldo"}</Button>
    </form>
  );
}
