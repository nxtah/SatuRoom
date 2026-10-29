"use client";

import { useRouter } from "next/navigation";
import { ChoiceChips } from "@/components/choice-chips";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { TIER_LABEL } from "@/lib/billing";
import { MemberInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";

interface Props {
  id?: string;
  initial?: { fullName: string; phone: string | null; tier: keyof typeof TIER_LABEL; note: string | null };
  discounts: { silver: number; gold: number };
}

export function MemberForm({ id, initial, discounts }: Props) {
  const router = useRouter();
  const form = useForm(MemberInput);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) => (id ? api<{ id?: string }>(`/members/${id}`, { method: "PATCH", body: input }) : api<{ id?: string }>("/members", { body: input })));
    if (!done) return;
    router.push(id ? `/member/${id}` : `/member/${done.data.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-label="Data member">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <Field label="Nama lengkap" name="fullName" defaultValue={initial?.fullName} autoFocus error={form.fields.fullName} />
      <Field label="Nomor HP" name="phone" type="tel" inputMode="tel" defaultValue={initial?.phone ?? ""} hint="Dipakai untuk mencari member di kasir." error={form.fields.phone} />
      <ChoiceChips legend="Tingkat" name="tier" defaultValue={[initial?.tier ?? "regular"]} options={[{ value: "regular", label: "Reguler" }, { value: "silver", label: `Silver · diskon ${discounts.silver}%` }, { value: "gold", label: `Gold · diskon ${discounts.gold}%` }]} error={form.fields.tier} />
      <Field label="Catatan (boleh kosong)" name="note" defaultValue={initial?.note ?? ""} placeholder="Contoh: suka meja dekat jendela" error={form.fields.note} />
      <Button type="submit" disabled={form.pending} className="justify-self-start">{form.pending ? "Menyimpan…" : "Simpan"}</Button>
    </form>
  );
}
