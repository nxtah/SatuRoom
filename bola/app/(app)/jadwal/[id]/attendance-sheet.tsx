"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { STATUS_STYLE } from "@/components/attendance-badge";
import { Maskot } from "@/components/maskot";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { ATTENDANCE, type AttendanceStatus } from "@/lib/schemas";

interface Entry {
  playerId: string;
  fullName: string;
  shirtNumber: number | null;
  status: AttendanceStatus | null;
  notice: { status: "excused" | "sick"; note: string | null } | null;
}

/** Lembar absensi untuk HP: satu ketukan per pemain, lalu simpan sekali. */
export function AttendanceSheet({ sessionId, roster, editable }: { sessionId: string; roster: Entry[]; editable: boolean }) {
  const router = useRouter();
  const saved = useMemo(() => new Map(roster.map((r) => [r.playerId, r.status])), [roster]);
  // Izin dari akun pemain langsung terisi; tetap bisa diubah pelatih sebelum disimpan.
  const [marks, setMarks] = useState(
    () => new Map(roster.map((r) => [r.playerId, r.status ?? (editable ? (r.notice?.status ?? null) : null)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const changed = roster.filter((r) => marks.get(r.playerId) && marks.get(r.playerId) !== saved.get(r.playerId));
  const filled = roster.filter((r) => marks.get(r.playerId)).length;
  const tally = Object.fromEntries(ATTENDANCE.map((a) => [a.id, roster.filter((r) => marks.get(r.playerId) === a.id).length]));

  function mark(playerId: string, status: AttendanceStatus) {
    setDone(false);
    setMarks((m) => new Map(m).set(playerId, status));
  }

  function allPresent() {
    setDone(false);
    setMarks((m) => {
      const next = new Map(m);
      for (const r of roster) if (!next.get(r.playerId)) next.set(r.playerId, "present");
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setError(undefined);
    const entries = changed.map((r) => ({ playerId: r.playerId, status: marks.get(r.playerId)! }));
    const res = await api<{ saved: number }>(`/sessions/${sessionId}/attendance`, { method: "PUT", body: { entries } });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setDone(true);
    router.refresh();
  }

  if (roster.length === 0) {
    return <p className="rounded-[2rem] bg-chalk p-8 text-center text-ink-soft">Belum ada pemain aktif di tim ini.</p>;
  }

  return (
    <div>
      {editable ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink-soft">
            {filled} dari {roster.length} sudah ditandai
          </p>
          {filled < roster.length ? (
            <Button variant="outline" size="sm" onClick={allPresent}>
              <Check aria-hidden className="size-4" /> Sisanya hadir
            </Button>
          ) : null}
        </div>
      ) : null}

      <ul className="grid gap-2">
        {roster.map((r) => {
          const current = marks.get(r.playerId) ?? null;
          return (
            <li key={r.playerId} className="rounded-[1.5rem] bg-chalk p-3 sm:flex sm:items-center sm:gap-4 sm:p-4">
              <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pitch text-sm font-extrabold text-white">
                  {r.shirtNumber ?? r.fullName[0]?.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold" id={`p-${r.playerId}`}>
                    {r.fullName}
                  </span>
                  {r.notice ? (
                    <span className="block text-sm text-ink-soft">
                      {r.notice.status === "sick" ? "Sakit" : "Izin"} dikirim pemain
                      {r.notice.note ? `: ${r.notice.note}` : ""}
                    </span>
                  ) : null}
                </span>
              </div>
              <div
                role="radiogroup"
                aria-labelledby={`p-${r.playerId}`}
                className="mt-3 grid grid-cols-4 gap-1.5 sm:mt-0 sm:w-[22rem] sm:shrink-0"
              >
                {ATTENDANCE.map((a) => {
                  const on = current === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={!editable}
                      onClick={() => mark(r.playerId, a.id)}
                      className={`h-12 rounded-2xl border-2 text-sm font-extrabold transition active:scale-95 disabled:cursor-default ${
                        on ? STATUS_STYLE[a.id].on : "border-line bg-chalk text-ink-soft hover:border-ink-soft/30"
                      } ${!editable && !on ? "opacity-40" : ""}`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {editable ? (
        <div className="sticky bottom-24 z-30 mt-4 md:bottom-4">
          <div className="flex items-center gap-3 rounded-[1.75rem] bg-pitch p-2 pl-5 text-white shadow-[0_24px_50px_-20px_rgb(13_59_46/0.8)]">
            {done && changed.length === 0 ? (
              <>
                <span className="pop -my-6 w-14 shrink-0">
                  <Maskot />
                </span>
                <p role="status" className="flex-1 font-extrabold">
                  Absen tersimpan
                </p>
              </>
            ) : (
              <p className="flex flex-1 flex-wrap gap-x-3 gap-y-0.5 text-sm font-bold" aria-live="polite">
                {ATTENDANCE.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span aria-hidden className={`size-2.5 rounded-full ${STATUS_STYLE[a.id].dot}`} />
                    {a.label} {tally[a.id]}
                  </span>
                ))}
              </p>
            )}
            <Button onClick={save} disabled={busy || changed.length === 0}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
          {error ? (
            <div className="mt-2">
              <Alert tone="error">{error}</Alert>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
