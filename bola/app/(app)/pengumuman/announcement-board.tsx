"use client";

import { Megaphone, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dayLabel } from "@/lib/dates";
import { AnnouncementInput } from "@/lib/schemas";
import { useForm } from "@/lib/use-form";
import type { AnnouncementRow } from "@/server/announcements";

interface Props {
  items: AnnouncementRow[];
  teams: { id: string; name: string }[];
  canWrite: boolean;
  /** Boleh menulis untuk seluruh akademi (pelatih hanya untuk timnya). */
  allAcademy: boolean;
  academyName: string;
}

const whatsappLink = (a: AnnouncementRow, academyName: string) =>
  `https://wa.me/?text=${encodeURIComponent(`*${a.title}*\n\n${a.body}\n\n_${academyName}_`)}`;

export function AnnouncementBoard({ items, teams, canWrite, allAcademy, academyName }: Props) {
  const router = useRouter();
  const form = useForm(AnnouncementInput);
  const [sent, setSent] = useState(false);
  const [archiveError, setArchiveError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const data = new FormData(el);
    setSent(false);
    const done = await form.submit(
      { title: data.get("title"), body: data.get("body"), teamId: data.get("teamId") ?? "" },
      (input) => api("/announcements", { body: input }),
    );
    if (!done) return;
    el.reset();
    setSent(true);
    router.refresh();
  }

  async function archive(id: string) {
    setArchiveError("");
    const res = await api(`/announcements/${id}/archive`, { method: "POST", body: {} });
    if (!res.ok) return setArchiveError(res.error.message);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      {canWrite ? (
        <form onSubmit={onSubmit} noValidate className="rise grid gap-4 rounded-[2rem] bg-chalk p-5 sm:p-7" aria-label="Tulis pengumuman">
          <h2 className="text-lg font-extrabold">Tulis pengumuman</h2>
          {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
          {sent ? <Alert tone="success">Pengumuman terkirim. Pemain bisa melihatnya di akun mereka.</Alert> : null}
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-bold">Judul</label>
            <input
              id="title" name="title" maxLength={100} autoComplete="off" placeholder="Contoh: Latihan Sabtu diganti jam 15.00"
              aria-invalid={form.fields.title ? true : undefined}
              className="h-13 w-full rounded-2xl border-2 border-line bg-chalk px-4 outline-none focus:border-pitch"
            />
            {form.fields.title ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.title}</p> : null}
          </div>
          <div>
            <label htmlFor="body" className="mb-2 block text-sm font-bold">Isi</label>
            <textarea
              id="body" name="body" rows={4} maxLength={1000} placeholder="Tulis dengan singkat dan jelas."
              aria-invalid={form.fields.body ? true : undefined}
              className="w-full rounded-2xl border-2 border-line bg-chalk p-4 outline-none focus:border-pitch"
            />
            {form.fields.body ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.body}</p> : null}
          </div>
          <div>
            <label htmlFor="teamId" className="mb-2 block text-sm font-bold">Untuk siapa</label>
            <select
              id="teamId" name="teamId" defaultValue={allAcademy ? "" : teams[0]?.id}
              className="h-13 w-full max-w-xs rounded-2xl border-2 border-line bg-chalk px-4 outline-none focus:border-pitch"
            >
              {allAcademy ? <option value="">Seluruh akademi</option> : null}
              {teams.map((t) => (<option key={t.id} value={t.id}>Tim {t.name}</option>))}
            </select>
            {form.fields.teamId ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.teamId}</p> : null}
          </div>
          <div>
            <Button type="submit" disabled={form.pending}>
              <Send aria-hidden className="size-5" /> {form.pending ? "Mengirim" : "Kirim pengumuman"}
            </Button>
          </div>
        </form>
      ) : null}

      {archiveError ? <Alert tone="error">{archiveError}</Alert> : null}

      {items.length === 0 ? (
        <EmptyState title="Belum ada pengumuman">
          {canWrite ? "Tulis yang pertama di atas. Pemain yang sudah punya akun akan langsung melihatnya." : "Pengumuman dari akademi akan muncul di sini."}
        </EmptyState>
      ) : (
        <ul className="rise grid gap-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-[2rem] bg-chalk p-5 sm:p-6">
              <div className="flex flex-wrap items-start gap-3">
                <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ember-soft text-ember-deep">
                  <Megaphone className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg leading-snug font-extrabold">{a.title}</h3>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {a.teamName ? `Tim ${a.teamName}` : "Seluruh akademi"}, {dayLabel(a.createdAt)}
                    {a.authorName ? `, oleh ${a.authorName}` : ""}
                  </p>
                </div>
              </div>
              <p className="mt-3 break-words whitespace-pre-line">{a.body}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={whatsappLink(a, academyName)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-full bg-turf px-4 text-sm font-bold text-white transition hover:bg-pitch"
                >
                  Bagikan ke WhatsApp
                </a>
                {a.canArchive ? (
                  <Button variant="outline" size="sm" onClick={() => archive(a.id)}>Hapus dari daftar</Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
