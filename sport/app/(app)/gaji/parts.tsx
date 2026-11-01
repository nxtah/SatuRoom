"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { rupiah } from "@/lib/money";
import type { RunView, StaffPay } from "@/server/payroll";

const cell = "h-10 w-full min-w-0 rounded-xl border-2 border-line bg-white px-2 outline-none focus:border-pitch";
const ATT_FIELDS = [
  { k: "perDay", l: "Gaji per hari hadir" },
  { k: "perHour", l: "Gaji per jam kerja (masuk sampai pulang)" },
] as const;
const FIELDS = [
  { k: "baseSalary", l: "Gaji pokok / bulan" },
  { k: "perSession", l: "Honor per sesi melatih" },
  { k: "allowance", l: "Tunjangan / bulan" },
  { k: "overtimePerHour", l: "Lembur per jam" },
  { k: "lateDeduction", l: "Potongan per terlambat" },
  { k: "unpaidLeaveDeduction", l: "Potongan per hari cuti tanpa gaji" },
] as const;
const STATUS = { draft: "Draf", approved: "Disetujui, belum dibayar", paid: "Sudah dibayar" };

export function PayProfiles({ profiles }: { profiles: StaffPay[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [mode, setMode] = useState<"monthly" | "attendance">("monthly");

  async function save(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await api(`/payroll/profiles/${id}`, {
      method: "PUT",
      body: {
        payMode: mode,
        ...Object.fromEntries([...FIELDS, ...ATT_FIELDS].map((x) => [x.k, String(f.get(x.k) ?? "0").replace(/[^0-9]/g, "") || "0"])),
      },
    });
    if (!r.ok) return setError(r.error.message);
    setError(undefined);
    setOpen(null);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <Alert tone="info">Pilih cara gajian tiap orang: bulanan (gaji pokok tetap) atau dari absensi (dihitung otomatis dari hari hadir dan jam absen masuk sampai pulang). Isi komponen yang berlaku saja, sisanya biarkan 0. Honor per sesi dihitung dari sesi tim yang dia latih. Lembur dan terlambat diambil dari Absensi staf.</Alert>
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ul className="grid gap-2">
        {profiles.map((p) => (
          <li key={p.membershipId} className="rise rounded-[1.5rem] bg-chalk p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 font-extrabold break-words">{p.name}</span>
              <span className="text-sm text-ink-soft">
                {p.configured ? [p.payMode === "attendance" && "dari absensi", p.perDay && `${rupiah(p.perDay)}/hari`, p.perHour && `${rupiah(p.perHour)}/jam`, p.payMode !== "attendance" && p.baseSalary && `pokok ${rupiah(p.baseSalary)}`, p.perSession && `${rupiah(p.perSession)}/sesi`].filter(Boolean).join(" · ") || "diatur" : "Belum diatur"}
              </span>
              <Button size="sm" variant={p.configured ? "ghost" : "outline"} onClick={() => { setMode(p.payMode); setOpen(open === p.membershipId ? null : p.membershipId); }}>
                {p.configured ? "Ubah" : "Atur gaji"}
              </Button>
            </div>
            {open === p.membershipId ? (
              <form onSubmit={(e) => save(e, p.membershipId)} className="mt-3 grid gap-3 sm:grid-cols-2">
                <fieldset className="grid gap-2 sm:col-span-2">
                  <legend className="mb-1 text-sm font-bold">Cara gajian</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([["monthly", "Bulanan", "Gaji pokok tetap tiap bulan"], ["attendance", "Dari absensi", "Dihitung otomatis dari absen masuk dan pulang"]] as const).map(([v, t, d]) => (
                      <label key={v} className={`flex cursor-pointer gap-2 rounded-2xl border-2 p-3 ${mode === v ? "border-pitch bg-white" : "border-line"}`}>
                        <input type="radio" name="payMode" value={v} checked={mode === v} onChange={() => setMode(v)} className="mt-1 accent-pitch" />
                        <span><span className="block font-extrabold">{t}</span><span className="text-sm text-ink-soft">{d}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {mode === "attendance"
                  ? ATT_FIELDS.map((x) => (
                      <label key={x.k} className="grid gap-1 text-sm font-bold">
                        {x.l}
                        <input name={x.k} inputMode="numeric" defaultValue={p[x.k] || ""} placeholder="0" className={cell} />
                      </label>
                    ))
                  : null}
                {FIELDS.filter((x) => mode === "monthly" || x.k !== "baseSalary").map((x) => (
                  <label key={x.k} className="grid gap-1 text-sm font-bold">
                    {x.l}
                    <input name={x.k} inputMode="numeric" defaultValue={p[x.k] || ""} placeholder="0" className={cell} />
                  </label>
                ))}
                <Button type="submit" className="justify-self-start sm:col-span-2">Simpan</Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RunPanel({
  month,
  today,
  run,
  hasProfiles,
  cashAccounts,
}: {
  month: string;
  today: string;
  run: RunView | null;
  hasProfiles: boolean;
  cashAccounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [adjust, setAdjust] = useState<string | null>(null);

  async function call(path: string, body: Record<string, unknown>, ask?: string) {
    if (ask && !confirm(ask)) return;
    setBusy(true);
    const r = await api(path, { body });
    setBusy(false);
    if (!r.ok) return setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
    setError(undefined);
    setAdjust(null);
    router.refresh();
  }

  if (!hasProfiles) {
    return (
      <EmptyState title="Belum ada staf yang diatur gajinya">
        Buka <a href="/gaji?tab=atur" className="font-bold underline">Pengaturan gaji</a>, isi gaji pokok atau honor per sesi, lalu kembali ke sini.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="rise flex flex-wrap items-center gap-2 rounded-[1.5rem] bg-chalk p-4">
        <span className="min-w-0 flex-1 font-bold">{run ? STATUS[run.status] : "Belum dihitung"}</span>
        {!run || run.status === "draft" ? (
          <Button variant={run ? "outline" : "primary"} disabled={busy} onClick={() => call("/payroll/runs", { month })}>
            {run ? "Hitung ulang" : "Hitung gaji"}
          </Button>
        ) : null}
        {run?.status === "draft" ? (
          <Button disabled={busy} onClick={() => call(`/payroll/runs/${run.id}`, { action: "approve" }, `Setujui gaji ${rupiah(run.total)}? Biaya gaji langsung dicatat di pembukuan.`)}>
            Setujui
          </Button>
        ) : null}
        {run?.status === "approved" ? (
          <>
            <Button variant="ghost" disabled={busy} onClick={() => call(`/payroll/runs/${run.id}`, { action: "unapprove" })}>Batalkan persetujuan</Button>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                call(`/payroll/runs/${run.id}`, { action: "pay", paidOn: f.get("paidOn"), accountId: f.get("accountId") });
              }}
            >
              <input type="date" name="paidOn" defaultValue={today} max={today} aria-label="Tanggal bayar" className={`${cell} w-40`} />
              <select name="accountId" aria-label="Dibayar dari" className={`${cell} w-32`} defaultValue={cashAccounts.find((a) => a.name === "Bank")?.id}>
                {cashAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <Button type="submit" disabled={busy}>Tandai dibayar</Button>
            </form>
          </>
        ) : null}
      </div>
      {run ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {run.slips.map((s) => (
            <li key={s.id} className="rise rounded-[1.5rem] bg-chalk p-5">
              <p className="font-extrabold">{s.staffName}</p>
              <ul className="mt-2 grid gap-1 text-sm">
                {s.lines.map((l, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="min-w-0 break-words">{l.label}</span>
                    <span className={`shrink-0 tabular-nums ${l.kind === "deduction" ? "text-flame" : ""}`}>{l.kind === "deduction" ? "-" : ""}{rupiah(l.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t-2 border-mist pt-2 font-extrabold">
                <span>Diterima</span>
                <span className="tabular-nums">{rupiah(s.net)}</span>
              </p>
              {run.status === "draft" ? (
                adjust === s.id ? (
                  <form
                    className="mt-3 grid gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      call(`/payslips/${s.id}`, { label: f.get("label"), amount: String(f.get("amount")).replace(/[^0-9]/g, ""), kind: f.get("kind") });
                    }}
                  >
                    <input name="label" placeholder="Bonus juara / kasbon" aria-label="Keterangan" className={cell} />
                    <div className="grid grid-cols-2 gap-2">
                      <input name="amount" inputMode="numeric" placeholder="Nominal" aria-label="Nominal" className={cell} />
                      <select name="kind" aria-label="Jenis" className={cell}>
                        <option value="earning">Tambahan</option>
                        <option value="deduction">Potongan</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" type="submit" disabled={busy}>Simpan</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAdjust(null)}>Batal</Button>
                    </div>
                  </form>
                ) : (
                  <Button size="sm" variant="ghost" className="mt-2" onClick={() => setAdjust(s.id)}>Tambah bonus/potongan</Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">Klik Hitung gaji. Anda masih bisa menambah bonus atau potongan sebelum menyetujui.</p>
      )}
    </div>
  );
}
