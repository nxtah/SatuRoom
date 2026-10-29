"use client";

import { useRouter } from "next/navigation";
import { ChoiceChips } from "@/components/choice-chips";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { ScheduleInput, WEEKDAYS } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";

export const DURATIONS = [
  { value: 60, label: "1 jam" },
  { value: 90, label: "1,5 jam" },
  { value: 120, label: "2 jam" },
];

export function ScheduleForm({ teams, today, defaultTeamId, next, locations }: {
  locations: { id: string; name: string; isPrimary: boolean }[];
  teams: { id: string; name: string }[];
  today: string;
  defaultTeamId?: string;
  next: string;
}) {
  const router = useRouter();
  const form = useForm(ScheduleInput);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const done = await form.submit(
      {
        teamId: data.get("teamId") ?? "",
        weekdays: data.getAll("weekdays"),
        startTime: data.get("startTime"),
        durationMin: data.get("durationMin") ?? "",
        startsOn: data.get("startsOn"),
        locationId: data.get("locationId"),
      },
      (input) => api<{ ids: string[] }>("/schedules", { body: input }),
    );
    if (!done) return;
    router.push(next);
    router.refresh();
  }

  const team = defaultTeamId ?? (teams.length === 1 ? teams[0]!.id : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-label="Tambah jadwal rutin">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <ChoiceChips
        legend="Tim"
        name="teamId"
        options={teams.map((t) => ({ value: t.id, label: t.name }))}
        defaultValue={team ? [team] : []}
        error={form.fields.teamId}
      />
      <ChoiceChips
        legend="Hari latihan"
        name="weekdays"
        multiple
        options={WEEKDAYS.map((d) => ({ value: d.id, label: d.short }))}
        error={form.fields.weekdays}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Jam mulai" name="startTime" type="time" defaultValue="15:30" error={form.fields.startTime} />
        <Field label="Mulai berlaku" name="startsOn" type="date" defaultValue={today} error={form.fields.startsOn} />
      </div>
      <ChoiceChips legend="Lama latihan" name="durationMin" options={DURATIONS} defaultValue={[90]} error={form.fields.durationMin} />
      {locations.length > 1 ? (
        <ChoiceChips legend="Lokasi" name="locationId" options={locations.map((l) => ({ value: l.id, label: l.name }))} defaultValue={locations.filter((l) => l.isPrimary).map((l) => l.id)} error={form.fields.locationId} />
      ) : null}
      <Button type="submit" disabled={form.pending} className="justify-self-start">
        {form.pending ? "Menyimpan…" : "Simpan jadwal"}
      </Button>
    </form>
  );
}
