"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { PlayerInput, POSITIONS } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";

interface Props {
  teams: { id: string; name: string }[];
  /** Kolom kontak wali hanya tampil untuk peran yang berhak. */
  showGuardian: boolean;
  player?: {
    id: string;
    fullName: string;
    birthDate: string;
    position: string | null;
    shirtNumber: number | null;
    teamIds: string[];
    guardianName: string | null;
    guardianPhone: string | null;
  };
  defaultTeamId?: string;
  next: string;
  /** Tampilkan tombol "Simpan dan tambah lagi" (form baru saja). */
  addAnother?: boolean;
}

export function PlayerForm({ teams, showGuardian, player, defaultTeamId, next, addAnother }: Props) {
  const router = useRouter();
  const form = useForm(PlayerInput);
  const selected = new Set(player?.teamIds ?? (defaultTeamId ? [defaultTeamId] : teams.length === 1 ? [teams[0]!.id] : []));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const again = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "again";
    const data = new FormData(el);
    const raw: Record<string, unknown> = {
      fullName: data.get("fullName"),
      birthDate: data.get("birthDate"),
      teamIds: data.getAll("teamIds"),
      position: data.get("position") ?? "",
      shirtNumber: data.get("shirtNumber"),
    };
    if (showGuardian) {
      raw.guardianName = data.get("guardianName");
      raw.guardianPhone = data.get("guardianPhone");
    }
    const done = await form.submit(raw, (input) =>
      player
        ? api<{ id?: string }>(`/players/${player.id}`, { method: "PATCH", body: input })
        : api<{ id?: string }>("/players", { body: input }),
    );
    if (!done) return;
    if (again) {
      // Kosongkan isian pemain, pertahankan pilihan tim agar input beruntun cepat.
      for (const name of ["fullName", "birthDate", "shirtNumber", "guardianName", "guardianPhone"]) {
        const input = el.elements.namedItem(name) as HTMLInputElement | null;
        if (input) input.value = "";
      }
      el.querySelectorAll<HTMLInputElement>('input[name="position"]').forEach((r) => (r.checked = false));
      (el.elements.namedItem("fullName") as HTMLInputElement).focus();
      form.setError(undefined);
      router.refresh();
      return;
    }
    const id = player?.id ?? done.data?.id ?? "";
    router.push(next.replace("{id}", id));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6" aria-label={player ? "Ubah pemain" : "Tambah pemain"}>
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}

      <div className="grid gap-5">
        <Field label="Nama lengkap" name="fullName" defaultValue={player?.fullName} error={form.fields.fullName} autoComplete="off" />
        <Field
          label="Tanggal lahir"
          name="birthDate"
          type="date"
          defaultValue={player?.birthDate}
          error={form.fields.birthDate}
          className="max-w-xs"
        />
        <fieldset>
          <legend className="mb-2 text-sm font-bold">Tim</legend>
          {teams.length === 0 ? (
            <p className="text-sm text-ink-soft">Belum ada tim. Buat tim dulu di menu Tim.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <label key={t.id} className="cursor-pointer">
                  <input type="checkbox" name="teamIds" value={t.id} defaultChecked={selected.has(t.id)} className="peer sr-only" />
                  <span className="flex h-11 items-center gap-2 rounded-full border-2 border-line bg-chalk px-4 font-bold transition peer-checked:border-pitch peer-checked:bg-pitch peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pitch hover:border-ink-soft/30 [&>svg]:hidden peer-checked:[&>svg]:block">
                    <Check aria-hidden className="size-4" />
                    {t.name}
                  </span>
                </label>
              ))}
            </div>
          )}
          {form.fields.teamIds ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.teamIds}</p> : null}
        </fieldset>
      </div>

      <details className="group rounded-[1.5rem] bg-mist p-5" open={Boolean(player?.position || player?.shirtNumber)}>
        <summary className="cursor-pointer font-extrabold marker:text-ink-soft">Posisi dan nomor punggung (boleh nanti)</summary>
        <div className="mt-4 grid gap-5">
          <fieldset>
            <legend className="mb-2 text-sm font-bold">Posisi</legend>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <label key={p.id} className="cursor-pointer">
                  <input type="radio" name="position" value={p.id} defaultChecked={player?.position === p.id} className="peer sr-only" />
                  <span className="flex h-10 items-center rounded-full border-2 border-line bg-chalk px-4 text-sm font-bold transition peer-checked:border-turf peer-checked:bg-turf-soft peer-checked:text-pitch peer-focus-visible:outline-2 peer-focus-visible:outline-pitch">
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field
            label="Nomor punggung"
            name="shirtNumber"
            inputMode="numeric"
            defaultValue={player?.shirtNumber ?? ""}
            error={form.fields.shirtNumber}
            className="max-w-40"
          />
        </div>
      </details>

      {showGuardian ? (
        <details className="rounded-[1.5rem] bg-mist p-5" open={Boolean(player?.guardianName || player?.guardianPhone)}>
          <summary className="cursor-pointer font-extrabold marker:text-ink-soft">Kontak orang tua/wali (boleh nanti)</summary>
          <p className="mt-2 text-sm text-ink-soft">Hanya terlihat oleh Pemilik dan Admin.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Nama wali" name="guardianName" defaultValue={player?.guardianName ?? ""} error={form.fields.guardianName} />
            <Field
              label="Nomor HP wali"
              name="guardianPhone"
              type="tel"
              inputMode="tel"
              placeholder="0812 3456 7890"
              defaultValue={player?.guardianPhone ?? ""}
              error={form.fields.guardianPhone}
            />
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={form.pending || teams.length === 0}>
          {form.pending ? "Menyimpan…" : player ? "Simpan perubahan" : "Simpan pemain"}
        </Button>
        {addAnother ? (
          <Button type="submit" name="intent" value="again" variant="outline" disabled={form.pending || teams.length === 0}>
            Simpan dan tambah lagi
          </Button>
        ) : null}
      </div>
    </form>
  );
}
