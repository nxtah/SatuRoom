"use client";

import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { TournamentInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";

export function TournamentForm({ today }: { today: string }) {
  const router = useRouter();
  const form = useForm(TournamentInput);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const done = await form.submit(
      { name: d.get("name"), eventDate: d.get("eventDate"), entryFee: d.get("entryFee") || 0, rounds: d.get("rounds"), rankPoints: [1, 2, 3, 4].map((n) => d.get(`p${n}`)), note: d.get("note") },
      (input) => api<{ id: string }>("/tournaments", { body: input }),
    );
    if (!done) return;
    router.push(`/turnamen/${done.data.id}`);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-label="Turnamen baru">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <Field label="Nama" name="name" placeholder="Contoh: Liga Jumat Malam" autoFocus error={form.fields.name} />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Tanggal" name="eventDate" type="date" defaultValue={today} error={form.fields.eventDate} />
        <Field label="Biaya daftar (Rp)" name="entryFee" inputMode="numeric" defaultValue="50000" error={form.fields.entryFee} />
        <Field label="Jumlah babak" name="rounds" inputMode="numeric" defaultValue="4" error={form.fields.rounds} />
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-bold">Poin klasemen per peringkat meja</legend>
        <p className="mb-3 text-sm text-ink-soft">Pemenang meja mendapat poin terbanyak. Ubah bila liga Anda memakai aturan lain.</p>
        <div className="grid grid-cols-4 gap-3">
          {[4, 2, 1, 0].map((v, i) => <Field key={i} label={`Juara ${i + 1}`} name={`p${i + 1}`} inputMode="numeric" defaultValue={v} />)}
        </div>
        {form.fields.rankPoints ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.rankPoints}</p> : null}
      </fieldset>
      <Field label="Catatan (boleh kosong)" name="note" placeholder="Aturan main, hadiah, dll." error={form.fields.note} />
      <Button type="submit" disabled={form.pending} className="justify-self-start">{form.pending ? "Menyimpan…" : "Buat turnamen"}</Button>
    </form>
  );
}
