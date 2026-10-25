"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

type Notice = { status: "excused" | "sick"; note: string | null } | null;

/** Kirim atau batalkan izin/sakit untuk satu latihan. */
export function NoticeActions({
  sessionId,
  notice,
}: {
  sessionId: string;
  notice: Notice;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<"excused" | "sick">();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send(method: "PUT" | "DELETE", body: object) {
    setBusy(true);
    setError(undefined);
    const r = await api("/me/player/notices", {
      method,
      body: { sessionId, ...body },
    });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    setChoice(undefined);
    setNote("");
    router.refresh();
  }

  if (notice) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-sun/35 px-3 py-1.5 text-sm font-bold">
          {notice.status === "sick" ? "Sakit" : "Izin"} sudah dikirim
          {notice.note ? `: ${notice.note}` : ""}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => send("DELETE", {})}
          className="rounded-full px-3 py-1.5 text-sm font-bold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
        >
          Batalkan
        </button>
        {error ? (
          <p className="w-full text-sm font-bold text-[#b42318]">{error}</p>
        ) : null}
      </div>
    );
  }

  if (!choice) {
    return (
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setChoice("excused")}
          className="h-10 rounded-full border-2 border-line px-4 text-sm font-extrabold transition hover:border-sun hover:bg-sun/20 active:scale-95"
        >
          Izin
        </button>
        <button
          type="button"
          onClick={() => setChoice("sick")}
          className="h-10 rounded-full border-2 border-line px-4 text-sm font-extrabold transition hover:border-[#7a8cff] hover:bg-[#7a8cff]/15 active:scale-95"
        >
          Sakit
        </button>
      </div>
    );
  }

  return (
    <form
      className="pop mt-3 grid gap-2 rounded-2xl bg-mist p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void send("PUT", { status: choice, note: note || undefined });
      }}
    >
      <label className="text-sm font-bold" htmlFor={`note-${sessionId}`}>
        {choice === "sick" ? "Sakit" : "Izin"}. Ada pesan untuk pelatih? (boleh
        kosong)
      </label>
      <input
        id={`note-${sessionId}`}
        value={note}
        maxLength={200}
        onChange={(e) => setNote(e.target.value)}
        placeholder={
          choice === "sick"
            ? "Contoh: demam sejak semalam"
            : "Contoh: acara keluarga"
        }
        className="h-11 rounded-xl border border-line bg-chalk px-3 outline-none focus:border-turf"
      />
      {error ? (
        <p className="text-sm font-bold text-[#b42318]">{error}</p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-full bg-pitch px-5 text-sm font-extrabold text-white transition hover:bg-pitch-2 disabled:opacity-50"
        >
          {busy ? "Mengirim…" : "Kirim ke pelatih"}
        </button>
        <button
          type="button"
          onClick={() => setChoice(undefined)}
          className="h-10 rounded-full px-4 text-sm font-bold text-ink-soft"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
