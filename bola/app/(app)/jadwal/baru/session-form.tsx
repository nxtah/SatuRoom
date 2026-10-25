"use client";

import { useRouter } from "next/navigation";
import { ChoiceChips } from "@/components/choice-chips";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { SessionInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";
import { DURATIONS } from "../rutin/schedule-form";

export function SessionForm({ teams, today }: { teams: { id: string; name: string }[]; today: string }) {
  const router = useRouter();
  const form = useForm(SessionInput);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const done = await form.submit(
      {
        teamId: data.get("teamId") ?? "",
        kind: data.get("kind") ?? "training",
        title: data.get("title"),
        date: data.get("date"),
        startTime: data.get("startTime"),
        durationMin: data.get("durationMin") ?? "",
      },
      (input) => api<{ id: string }>("/sessions", { body: input }),
    );
    if (!done) return;
    router.push(`/jadwal/${done.data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-label="Tambah sesi">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <ChoiceChips
        legend="Jenis"
        name="kind"
        options={[
          { value: "training", label: "Latihan" },
          { value: "match", label: "Pertandingan" },
        ]}
        defaultValue={["training"]}
      />
      <ChoiceChips
        legend="Tim"
        name="teamId"
        options={teams.map((t) => ({ value: t.id, label: t.name }))}
        defaultValue={teams.length === 1 ? [teams[0]!.id] : []}
        error={form.fields.teamId}
      />
      <Field
        label="Judul (boleh kosong)"
        name="title"
        placeholder="Contoh: Uji coba lawan SSB Elang"
        maxLength={80}
        error={form.fields.title}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tanggal" name="date" type="date" defaultValue={today} error={form.fields.date} />
        <Field label="Jam mulai" name="startTime" type="time" defaultValue="15:30" error={form.fields.startTime} />
      </div>
      <ChoiceChips legend="Lama" name="durationMin" options={DURATIONS} defaultValue={[90]} error={form.fields.durationMin} />
      <Button type="submit" disabled={form.pending} className="justify-self-start">
        {form.pending ? "Menyimpan…" : "Simpan sesi"}
      </Button>
    </form>
  );
}
