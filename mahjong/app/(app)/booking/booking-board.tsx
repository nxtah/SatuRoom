"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, Link2, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { addDays, dayLabel } from "@/lib/dates";
import { whatsappLink } from "@/lib/money";
import { BookingInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { BookingRow } from "@/server/bookings";
import type { TableRow } from "@/server/tables";

const STATUS: Record<BookingRow["status"], { label: string; cls: string }> = {
  requested: { label: "Menunggu meja", cls: "bg-[#f6e7bd] text-[#6b5314]" },
  booked: { label: "Dipesan", cls: "bg-turf-soft text-pitch" },
  arrived: { label: "Sudah datang", cls: "bg-pitch text-white" },
  cancelled: { label: "Batal", cls: "bg-mist text-ink-soft" },
  no_show: { label: "Tidak datang", cls: "bg-[#fdecec] text-[#b42318]" },
};

export function BookingBoard({ date, today, bookings, pending, tables, link, openTime }: { date: string; today: string; bookings: BookingRow[]; pending: BookingRow[]; tables: TableRow[]; link: string | null; openTime: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");

  async function patch(id: string, body: object) {
    setError(undefined);
    const r = await api(`/bookings/${id}`, { method: "PATCH", body });
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }

  const publicUrl = link ? `${origin}/pesan/${link}` : null;

  return (
    <>
      {error ? <div className="mb-4"><Alert tone="error">{error}</Alert></div> : null}

      {pending.length ? (
        <section className="rise mb-6" aria-labelledby="menunggu">
          <h2 id="menunggu" className="mb-2 text-lg font-extrabold">Permintaan dari link publik ({pending.length})</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pending.map((b) => (
              <li key={b.id} className="tile border-sun p-4">
                <p className="font-extrabold">{b.name} · {b.pax} orang</p>
                <p className="text-sm text-ink-soft">{dayLabel(b.date)}, {b.startTime}-{b.endTime}{b.note ? ` · ${b.note}` : ""}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select aria-label={`Pilih meja untuk ${b.name}`} defaultValue="" onChange={(e) => e.target.value && patch(b.id, { tableId: e.target.value })} className="h-10 min-w-0 flex-1 rounded-xl border-2 border-line bg-chalk px-3 text-sm font-semibold">
                    <option value="">Beri meja…</option>
                    {tables.filter((t) => t.seats >= b.pax).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  {b.phone ? <a href={whatsappLink(b.phone, `Halo ${b.name}, booking meja mahjong ${dayLabel(b.date)} pukul ${b.startTime} kami konfirmasi.`)} className="grid h-10 place-items-center rounded-xl bg-mist px-3 text-sm font-bold">WhatsApp</a> : null}
                  <Button variant="danger" size="sm" onClick={() => patch(b.id, { status: "cancelled" })}>Tolak</Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="rise mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/booking?tgl=${addDays(date, -1)}`} aria-label="Hari sebelumnya" className="tile grid size-11 place-items-center"><ChevronLeft aria-hidden className="size-5" /></Link>
        <p className="min-w-40 text-center text-lg font-extrabold">{date === today ? "Hari ini" : dayLabel(date)}</p>
        <Link href={`/booking?tgl=${addDays(date, 1)}`} aria-label="Hari berikutnya" className="tile grid size-11 place-items-center"><ChevronRight aria-hidden className="size-5" /></Link>
        {date !== today ? <Link href="/booking" className="text-sm font-bold text-ember">Ke hari ini</Link> : null}
        <Button className="ml-auto" onClick={() => setAdding((a) => !a)}><CalendarPlus aria-hidden className="size-5" /> Booking baru</Button>
      </div>

      {adding ? <BookingForm date={date} tables={tables} openTime={openTime} onDone={() => { setAdding(false); router.refresh(); }} onCancel={() => setAdding(false)} /> : null}

      {bookings.filter((b) => b.status !== "requested").length ? (
        <ul className="rise grid gap-2">
          {bookings.filter((b) => b.status !== "requested").map((b) => (
            <li key={b.id} className="tile flex flex-wrap items-center gap-4 p-4">
              <p className="tnum w-20 text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{b.startTime}</p>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{b.name} · {b.pax} orang</p>
                <p className="truncate text-sm text-ink-soft">{b.tableName ?? "Belum ada meja"} sampai {b.endTime}{b.deposit ? ` · uang muka ${b.deposit.toLocaleString("id-ID")}` : ""}{b.note ? ` · ${b.note}` : ""}</p>
              </div>
              <span className={`rounded-lg px-2.5 py-1 text-xs font-extrabold ${STATUS[b.status].cls}`}>{STATUS[b.status].label}</span>
              {b.phone ? <a aria-label={`Hubungi ${b.name}`} href={whatsappLink(b.phone, `Halo ${b.name}, mengingatkan booking meja mahjong hari ini pukul ${b.startTime}.`)} className="grid size-10 place-items-center rounded-lg hover:bg-mist"><Phone aria-hidden className="size-4" /></a> : null}
              {b.status === "booked" ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => patch(b.id, { status: "no_show" })}>Tidak datang</Button>
                  <Button variant="danger" size="sm" onClick={() => patch(b.id, { status: "cancelled" })}>Batalkan</Button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : adding ? null : (
        <EmptyState title="Belum ada booking hari ini">Booking dari telepon atau WhatsApp dicatat di sini, supaya meja tidak bentrok.</EmptyState>
      )}

      <section className="tile rise mt-6 flex flex-wrap items-center gap-3 p-4">
        <Link2 aria-hidden className="size-5 text-ember" />
        {publicUrl ? (
          <>
            <p className="min-w-0 flex-1 text-sm"><b>Link booking untuk pelanggan:</b> <span className="break-all text-ink-soft">{publicUrl}</span></p>
            <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard?.writeText(publicUrl).catch(() => undefined); setCopied(true); }}>{copied ? "Tersalin" : "Salin link"}</Button>
          </>
        ) : <p className="flex-1 text-sm text-ink-soft">Link booking publik sedang dimatikan. Nyalakan di Lainnya, Aturan tempat.</p>}
      </section>
    </>
  );
}

function BookingForm({ date, tables, openTime, onDone, onCancel }: { date: string; tables: TableRow[]; openTime: string; onDone: () => void; onCancel: () => void }) {
  const form = useForm(BookingInput);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const done = await form.submit(formValues(e.currentTarget), (input) => api("/bookings", { body: input }));
    if (done) onDone();
  }
  return (
    <form onSubmit={onSubmit} noValidate className="tile rise mb-5 grid gap-4 p-5" aria-label="Booking baru">
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama pemesan" name="name" autoFocus error={form.fields.name} />
        <Field label="Nomor HP" name="phone" type="tel" inputMode="tel" error={form.fields.phone} />
        <Field label="Tanggal" name="date" type="date" defaultValue={date} error={form.fields.date} />
        <Field label="Jam mulai" name="startTime" type="time" defaultValue={openTime} error={form.fields.startTime} />
        <div>
          <label htmlFor="b-table" className="mb-2 block text-sm font-bold">Meja</label>
          <select id="b-table" name="tableId" className="h-13 w-full rounded-xl border-2 border-line bg-chalk px-3">
            {tables.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.seats} kursi)</option>)}
          </select>
          {form.fields.tableId ? <p className="mt-2 text-sm font-semibold text-[#b42318]">{form.fields.tableId}</p> : null}
        </div>
        <div>
          <label htmlFor="b-dur" className="mb-2 block text-sm font-bold">Lama</label>
          <select id="b-dur" name="durationMin" defaultValue="120" className="h-13 w-full rounded-xl border-2 border-line bg-chalk px-3">
            {[60, 90, 120, 180, 240, 300].map((m) => <option key={m} value={m}>{m / 60} jam</option>)}
          </select>
        </div>
        <Field label="Jumlah orang" name="pax" inputMode="numeric" defaultValue="4" error={form.fields.pax} />
        <Field label="Uang muka (Rp, boleh kosong)" name="deposit" inputMode="numeric" error={form.fields.deposit} />
      </div>
      <Field label="Catatan (boleh kosong)" name="note" error={form.fields.note} />
      <div className="flex gap-3">
        <Button type="submit" disabled={form.pending}>{form.pending ? "Menyimpan…" : "Simpan booking"}</Button>
        <Button variant="ghost" onClick={onCancel}>Batal</Button>
      </div>
    </form>
  );
}
