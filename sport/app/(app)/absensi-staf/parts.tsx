"use client";

import { CalendarClock, Check, LogIn, LogOut, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { api } from "@/lib/api";
import { StaffRequestInput } from "@/lib/schemas";
import { formValues, useForm } from "@/lib/use-form";
import type { BoardRow, DayStatus, MyAttendance, RecapRow, Shift, StaffRequestRow } from "@/server/staff-attendance";

const DAYS = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const LEAVE: Record<string, string> = { annual: "Cuti tahunan", sick: "Sakit", personal: "Keperluan pribadi", unpaid: "Cuti tanpa gaji" };
const STATUS_REQ: Record<string, { label: string; cls: string }> = {
  pending: { label: "Menunggu", cls: "bg-sun/40 text-ink" },
  approved: { label: "Disetujui", cls: "bg-turf-soft text-pitch" },
  rejected: { label: "Ditolak", cls: "bg-flame/15 text-flame" },
  cancelled: { label: "Dibatalkan", cls: "bg-mist text-ink-soft" },
};
const STATUS_DAY: Record<DayStatus, { label: string; cls: string }> = {
  present: { label: "Hadir", cls: "bg-turf-soft text-pitch" },
  late: { label: "Terlambat", cls: "bg-sun/40 text-ink" },
  absent: { label: "Tidak hadir", cls: "bg-flame/15 text-flame" },
  leave: { label: "Cuti", cls: "bg-ember-soft text-ember-deep" },
  off: { label: "Libur", cls: "bg-mist text-ink-soft" },
  waiting: { label: "Belum datang", cls: "bg-mist text-ink" },
};

const hours = (min: number) => `${Math.floor(min / 60)} j ${min % 60} m`;
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

function describe(r: StaffRequestRow) {
  if (r.kind === "correction") return `Koreksi absen ${fmtDate(r.dateFrom)}: masuk ${r.clockIn}${r.clockOut ? `, pulang ${r.clockOut}` : ""}`;
  if (r.kind === "overtime") return `Lembur ${fmtDate(r.dateFrom)}: ${hours(r.minutes ?? 0)}`;
  return `${LEAVE[r.leaveType ?? "annual"]} ${fmtDate(r.dateFrom)}${r.dateTo !== r.dateFrom ? ` s/d ${fmtDate(r.dateTo)}` : ""}`;
}

function Pill({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${cls}`}>{label}</span>;
}

// ---------- Absen saya ----------

export function ClockCard({ me }: { me: MyAttendance }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function clock(action: "in" | "out") {
    setBusy(true);
    setError(undefined);
    const r = await api("/staff-attendance/clock", { body: { action } });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }
  const done = me.clock?.clockOut;
  return (
    <section className="rise rounded-[2rem] bg-pitch p-6 text-white">
      <p className="text-sm font-bold text-white/70">{fmtDate(me.today)}</p>
      <p className="mt-1 text-2xl font-extrabold">
        {me.onLeave ? "Anda sedang cuti hari ini" : done ? "Kerja hari ini selesai" : me.clock ? "Sedang bekerja" : "Belum absen masuk"}
      </p>
      <p className="mt-1 text-sm text-white/80">
        {me.shiftToday ? `Jadwal: ${me.shiftToday.start}-${me.shiftToday.end}` : "Tidak ada jadwal kerja hari ini"}
        {me.clock ? ` · Masuk ${me.clock.clockIn}${me.clock.clockOut ? ` · Pulang ${me.clock.clockOut}` : ""}` : ""}
      </p>
      {error ? <div className="mt-4"><Alert tone="error">{error}</Alert></div> : null}
      {!done ? (
        <Button
          size="lg"
          variant="primary"
          className="mt-5 w-full sm:w-auto"
          disabled={busy}
          onClick={() => clock(me.clock ? "out" : "in")}
        >
          {me.clock ? <LogOut aria-hidden className="size-5" /> : <LogIn aria-hidden className="size-5" />}
          {busy ? "Menyimpan…" : me.clock ? "Absen pulang" : "Absen masuk"}
        </Button>
      ) : null}
      <dl className="mt-6 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          ["Hadir bulan ini", `${me.month.daysPresent} hari`],
          ["Terlambat", `${me.month.lateDays} kali`],
          ["Lembur", hours(me.month.overtimeMinutes)],
          ["Cuti", `${me.month.leaveDays} hari`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white/10 p-3">
            <dt className="text-white/70">{k}</dt>
            <dd className="font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>
      {me.shifts.length ? (
        <p className="mt-4 text-xs text-white/70">Jadwal mingguan: {me.shifts.map((s) => `${DAYS[s.weekday]} ${s.start}-${s.end}`).join(" · ")}</p>
      ) : null}
    </section>
  );
}

export function RequestForm({ today }: { today: string }) {
  const router = useRouter();
  const form = useForm(StaffRequestInput);
  const [kind, setKind] = useState<"correction" | "leave" | "overtime">("correction");
  const [sent, setSent] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    setSent(false);
    const done = await form.submit({ ...formValues(el), kind }, (input) => api("/staff-attendance/requests", { body: input }));
    if (!done) return;
    el.reset();
    setSent(true);
    router.refresh();
  }
  const KINDS = [
    { key: "correction", label: "Koreksi absen", hint: "Lupa absen atau jam salah." },
    { key: "leave", label: "Cuti / izin", hint: "Tidak masuk satu hari atau lebih." },
    { key: "overtime", label: "Lembur", hint: "Kerja di luar jadwal." },
  ] as const;
  return (
    <form onSubmit={onSubmit} noValidate aria-label="Buat pengajuan" className="rise grid content-start gap-5 rounded-[2rem] bg-chalk p-6">
      <h2 className="flex items-center gap-2 text-lg font-extrabold"><CalendarClock aria-hidden className="size-5" /> Buat pengajuan</h2>
      <div role="radiogroup" aria-label="Jenis pengajuan" className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="radio"
            aria-checked={kind === k.key}
            onClick={() => setKind(k.key)}
            className={`rounded-2xl border-2 p-3 text-left transition ${kind === k.key ? "border-pitch bg-pitch text-white" : "border-line bg-white hover:border-pitch"}`}
          >
            <span className="block font-extrabold">{k.label}</span>
            <span className={`block text-xs ${kind === k.key ? "text-white/80" : "text-ink-soft"}`}>{k.hint}</span>
          </button>
        ))}
      </div>
      {sent ? <Alert tone="success">Pengajuan terkirim. Pengelola akan menyetujui atau menolaknya.</Alert> : null}
      {form.error && !form.error.fields ? <Alert tone="error">{form.error.message}</Alert> : null}
      {kind === "correction" ? (
        <>
          <Field label="Tanggal" name="date" type="date" max={today} defaultValue={today} error={form.fields.date} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Jam masuk" name="clockIn" type="time" error={form.fields.clockIn} />
            <Field label="Jam pulang (boleh kosong)" name="clockOut" type="time" error={form.fields.clockOut} />
          </div>
        </>
      ) : kind === "leave" ? (
        <>
          <label className="grid gap-2 text-sm font-bold">
            Jenis
            <select name="leaveType" className="h-12 rounded-2xl border-2 border-line bg-white px-4 text-base font-normal outline-none focus:border-pitch">
              {Object.entries(LEAVE).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dari" name="dateFrom" type="date" defaultValue={today} error={form.fields.dateFrom} />
            <Field label="Sampai" name="dateTo" type="date" defaultValue={today} error={form.fields.dateTo} />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal" name="date" type="date" max={today} defaultValue={today} error={form.fields.date} />
          <Field label="Lama (menit)" name="minutes" inputMode="numeric" placeholder="90" error={form.fields.minutes} />
        </div>
      )}
      <Field label="Alasan" name="reason" placeholder="Contoh: HP mati saat datang" error={form.fields.reason} />
      <Button type="submit" disabled={form.pending} className="justify-self-start">{form.pending ? "Mengirim…" : "Kirim pengajuan"}</Button>
    </form>
  );
}

export function MyRequests({ requests }: { requests: StaffRequestRow[] }) {
  const router = useRouter();
  if (!requests.length) return null;
  async function cancel(id: string) {
    const r = await api(`/staff-attendance/requests/${id}`, { method: "DELETE" });
    if (r.ok) router.refresh();
  }
  return (
    <section className="rise rounded-[2rem] bg-chalk p-6">
      <h2 className="text-lg font-extrabold">Pengajuan saya</h2>
      <ul className="mt-3 grid gap-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-mist p-3">
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-sm font-bold">{describe(r)}</p>
              <p className="text-xs text-ink-soft">{r.reason}{r.decisionNote ? ` · Catatan: ${r.decisionNote}` : ""}</p>
            </div>
            <Pill {...STATUS_REQ[r.status]!} />
            {r.status === "pending" ? <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Batalkan</Button> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- Pengelola ----------

export function TeamBoard({ board }: { board: { date: string; today: string; rows: BoardRow[] } }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const counts = board.rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  return (
    <div className="grid gap-4">
      <div className="rise flex flex-wrap items-end gap-3 rounded-[2rem] bg-chalk p-5">
        <label className="grid gap-1 text-sm font-bold">
          Tanggal
          <input
            type="date"
            defaultValue={board.date}
            max={board.today}
            onChange={(e) => e.target.value && router.push(`/absensi-staf?tab=tim&tanggal=${e.target.value}`)}
            className="h-11 rounded-2xl border-2 border-line bg-white px-3 font-normal"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_DAY) as DayStatus[]).filter((k) => counts[k]).map((k) => (
            <Pill key={k} label={`${STATUS_DAY[k].label} ${counts[k]}`} cls={STATUS_DAY[k].cls} />
          ))}
        </div>
      </div>
      <ul className="grid gap-3">
        {board.rows.map((r) => (
          <li key={r.membershipId} className="rise rounded-[2rem] bg-chalk p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1 basis-48">
                <p className="break-words font-extrabold">{r.name}</p>
                <p className="text-sm text-ink-soft">
                  {r.shift ? `Jadwal ${r.shift.start}-${r.shift.end}` : "Tidak ada jadwal hari ini"}
                  {r.clockIn ? ` · Masuk ${r.clockIn}` : ""}
                  {r.clockOut ? ` · Pulang ${r.clockOut}` : ""}
                </p>
              </div>
              <Pill {...STATUS_DAY[r.status]} />
              <Button size="sm" variant="outline" onClick={() => setEditing(editing === r.membershipId ? null : r.membershipId)}>
                Jadwal kerja
              </Button>
            </div>
            {editing === r.membershipId ? <ShiftEditor membershipId={r.membershipId} shifts={r.shifts} onDone={() => setEditing(null)} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ShiftEditor({ membershipId, shifts, onDone }: { membershipId: string; shifts: Shift[]; onDone: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const list = [1, 2, 3, 4, 5, 6, 7]
      .filter((d) => data.get(`on${d}`))
      .map((d) => ({ weekday: d, start: String(data.get(`start${d}`)), end: String(data.get(`end${d}`)) }));
    setBusy(true);
    setError(undefined);
    const r = await api(`/staff-attendance/shifts/${membershipId}`, { method: "PUT", body: { shifts: list } });
    setBusy(false);
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    onDone();
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 rounded-2xl bg-mist p-4" aria-label="Jadwal kerja mingguan">
      <p className="text-sm text-ink-soft">Centang hari kerja lalu isi jamnya. Terlambat dihitung lebih dari 10 menit setelah jam masuk.</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const s = shifts.find((x) => x.weekday === d);
        return (
          <div key={d} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" name={`on${d}`} defaultChecked={Boolean(s)} className="size-5 accent-pitch" />
              {DAYS[d]}
            </label>
            <input type="time" name={`start${d}`} defaultValue={s?.start ?? "08:00"} aria-label={`${DAYS[d]} masuk`} className="h-10 min-w-0 rounded-xl border-2 border-line bg-white px-2" />
            <input type="time" name={`end${d}`} defaultValue={s?.end ?? "16:00"} aria-label={`${DAYS[d]} pulang`} className="h-10 min-w-0 rounded-xl border-2 border-line bg-white px-2" />
          </div>
        );
      })}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Menyimpan…" : "Simpan jadwal"}</Button>
        <Button size="sm" variant="ghost" onClick={onDone}>Tutup</Button>
      </div>
    </form>
  );
}

export function ApprovalList({ pending, done, selfId, isOwner }: { pending: StaffRequestRow[]; done: StaffRequestRow[]; selfId: string; isOwner: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  async function decide(id: string, decision: "approved" | "rejected") {
    const note = decision === "rejected" ? prompt("Alasan menolak (boleh kosong):") ?? "" : "";
    setBusy(id);
    setError(undefined);
    const r = await api(`/staff-attendance/requests/${id}`, { method: "PATCH", body: { decision, note } });
    setBusy(null);
    if (!r.ok) return setError(r.error.message);
    router.refresh();
  }
  return (
    <div className="grid gap-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <section className="rise rounded-[2rem] bg-chalk p-6">
        <h2 className="text-lg font-extrabold">Menunggu persetujuan</h2>
        {pending.length === 0 ? <p className="mt-2 text-sm text-ink-soft">Tidak ada pengajuan baru.</p> : null}
        <ul className="mt-3 grid gap-2">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-mist p-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-extrabold">{r.staffName}</p>
                <p className="text-sm">{describe(r)}</p>
                <p className="text-xs text-ink-soft">Alasan: {r.reason}</p>
              </div>
              {r.membershipId === selfId && !isOwner ? (
                <p className="text-xs text-ink-soft">Pengajuan Anda diputuskan pengelola lain.</p>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={busy === r.id} onClick={() => decide(r.id, "approved")}><Check aria-hidden className="size-4" /> Setujui</Button>
                  <Button size="sm" variant="danger" disabled={busy === r.id} onClick={() => decide(r.id, "rejected")}><X aria-hidden className="size-4" /> Tolak</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      {done.length ? (
        <section className="rise rounded-[2rem] bg-chalk p-6">
          <h2 className="text-lg font-extrabold">Sudah diputuskan</h2>
          <ul className="mt-3 grid gap-2">
            {done.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-mist p-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="text-sm font-bold">{r.staffName} · {describe(r)}</p>
                  {r.decisionNote ? <p className="text-xs text-ink-soft">Catatan: {r.decisionNote}</p> : null}
                </div>
                <Pill {...STATUS_REQ[r.status]!} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function RecapTable({ month, rows }: { month: string; rows: RecapRow[] }) {
  const router = useRouter();
  return (
    <div className="grid gap-4">
      <div className="rise flex flex-wrap items-end gap-3 rounded-[2rem] bg-chalk p-5">
        <label className="grid gap-1 text-sm font-bold">
          Bulan
          <input
            type="month"
            defaultValue={month}
            onChange={(e) => e.target.value && router.push(`/absensi-staf?tab=rekap&bulan=${e.target.value}`)}
            className="h-11 rounded-2xl border-2 border-line bg-white px-3 font-normal"
          />
        </label>
        <p className="text-sm text-ink-soft">Rekap ini juga dipakai saat menghitung gaji.</p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.membershipId} className="rise rounded-[2rem] bg-chalk p-5">
            <p className="break-words font-extrabold">{r.name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {[
                ["Hadir", `${r.daysPresent} hari`],
                ["Terlambat", `${r.lateDays} kali`],
                ["Jam kerja", hours(r.workedMinutes)],
                ["Lembur", hours(r.overtimeMinutes)],
                ["Cuti", `${r.leaveDays} hari`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-mist p-2.5">
                  <dt className="text-xs text-ink-soft">{k}</dt>
                  <dd className="font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
