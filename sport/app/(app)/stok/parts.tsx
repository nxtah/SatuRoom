"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { monthLabel, rupiah } from "@/lib/money";
import type { AssetRow, ItemRow, PurchaseRow } from "@/server/inventory";

const cell = "h-10 w-full min-w-0 rounded-xl border-2 border-line bg-white px-2 outline-none focus:border-pitch";
const digits = (v: FormDataEntryValue | null) => String(v ?? "").replace(/[^0-9]/g, "");
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
type Opt = { id: string; name: string };

function useCall() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function call(path: string, body: unknown, method?: string): Promise<boolean> {
    setBusy(true);
    const r = await api(path, { method, body });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.fields ? Object.values(r.error.fields)[0] : r.error.message);
      return false;
    }
    setError(undefined);
    router.refresh();
    return true;
  }
  return { call, error, busy };
}

// ---------- Barang ----------

type Call = (path: string, body: unknown, method?: string) => Promise<boolean>;

function ItemForm({ item, storeOn, call, busy, onDone }: { item?: ItemRow; storeOn: boolean; call: Call; busy: boolean; onDone: () => void }) {
  const [sale, setSale] = useState(item?.forSale ?? false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const el = e.currentTarget;
        const f = new FormData(el);
        const ok = await call(item ? `/items/${item.id}` : "/items", {
          name: f.get("name"), unit: f.get("unit") || "pcs", minQty: digits(f.get("minQty")) || "0", forSale: sale,
          salePrice: sale ? digits(f.get("salePrice")) : "", description: f.get("description"),
        }, item ? "PUT" : undefined);
        if (ok) { el.reset(); onDone(); }
      }}
    >
      <label className="grid gap-1 text-sm font-bold">Nama barang<input name="name" defaultValue={item?.name} placeholder="Jersey latihan" className={cell} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-sm font-bold">Satuan<input name="unit" defaultValue={item?.unit ?? "pcs"} className={cell} /></label>
        <label className="grid gap-1 text-sm font-bold">Ingatkan bila sisa<input name="minQty" inputMode="numeric" defaultValue={item?.minQty || ""} placeholder="0" className={cell} /></label>
      </div>
      {storeOn ? (
        <>
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
            <input type="checkbox" checked={sale} onChange={(e) => setSale(e.target.checked)} className="size-5 accent-pitch" /> Dijual di toko
          </label>
          {sale ? (
            <>
              <label className="grid gap-1 text-sm font-bold">Harga jual (Rp)<input name="salePrice" inputMode="numeric" defaultValue={item?.salePrice ?? ""} className={cell} /></label>
              <label className="grid gap-1 text-sm font-bold">Keterangan (boleh kosong)<input name="description" defaultValue={item?.description ?? ""} placeholder="Ukuran S-XL" className={cell} /></label>
            </>
          ) : null}
        </>
      ) : null}
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={busy}>{item ? "Simpan" : "Tambah barang"}</Button>
        {item ? <Button variant="ghost" onClick={onDone}>Batal</Button> : null}
      </div>
    </form>
  );
}


export function ItemsPanel({ items, storeOn }: { items: ItemRow[]; storeOn: boolean }) {
  const { call, error, busy } = useCall();
  const [edit, setEdit] = useState<string | null>(null);
  const [issue, setIssue] = useState<string | null>(null);

  return (
    <div className="grid gap-4">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <details className="rise rounded-[2rem] bg-chalk p-5" open={items.length === 0}>
        <summary className="cursor-pointer font-extrabold">Tambah barang</summary>
        <p className="mt-1 mb-3 text-sm text-ink-soft">Stok awal masuk lewat Pembelian, atau lewat Stok opname bila barangnya sudah ada.</p>
        <ItemForm storeOn={storeOn} call={call} busy={busy} onDone={() => undefined} />
      </details>
      {items.length === 0 ? <EmptyState title="Belum ada barang">Contoh: bola, rompi, cone, jersey, botol minum.</EmptyState> : null}
      <ul className="grid gap-2">
        {items.map((i) => (
          <li key={i.id} className="rise rounded-[1.5rem] bg-chalk p-4">
            {edit === i.id ? (
              <ItemForm item={i} storeOn={storeOn} call={call} busy={busy} onDone={() => setEdit(null)} />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 basis-40 font-extrabold break-words">
                    {i.name}
                    {i.forSale ? <span className="ml-2 rounded-full bg-turf-soft px-2 py-0.5 text-xs text-pitch">Dijual {rupiah(i.salePrice ?? 0)}</span> : null}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${i.low ? "bg-flame/15 text-flame" : i.qty === 0 ? "bg-mist text-ink-soft" : "bg-mist"}`}>
                    {i.qty} {i.unit}{i.low ? " · hampir habis" : ""}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">Harga pokok rata-rata {rupiah(i.avgCost)} · nilai {rupiah(i.value)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEdit(i.id)}>Ubah</Button>
                  {i.qty > 0 ? <Button size="sm" variant="ghost" onClick={() => setIssue(issue === i.id ? null : i.id)}>Pakai</Button> : null}
                  {i.qty === 0 ? <Button size="sm" variant="ghost" onClick={() => confirm(`Arsipkan ${i.name}?`) && call(`/items/${i.id}`, undefined, "DELETE")}>Arsipkan</Button> : null}
                </div>
                {issue === i.id ? (
                  <form
                    className="mt-2 flex flex-wrap items-end gap-2 rounded-2xl bg-mist p-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      if (await call("/stock/issue", { itemId: i.id, qty: digits(f.get("qty")), note: f.get("note") })) setIssue(null);
                    }}
                  >
                    <label className="grid gap-1 text-sm font-bold">Jumlah<input name="qty" inputMode="numeric" defaultValue={1} className={`${cell} w-20`} /></label>
                    <label className="grid min-w-0 flex-1 basis-40 gap-1 text-sm font-bold">Dipakai untuk<input name="note" placeholder="Latihan U-12" className={cell} /></label>
                    <Button size="sm" type="submit" disabled={busy}>Catat</Button>
                  </form>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Pembelian ----------

const PO_STATUS = { ordered: "Dipesan", received: "Diterima", cancelled: "Dibatalkan" };

export function PurchasesPanel({
  today,
  items,
  suppliers,
  purchases,
  cash,
}: {
  today: string;
  items: ItemRow[];
  suppliers: { id: string; name: string; phone: string | null; owed: number }[];
  purchases: PurchaseRow[];
  cash: Opt[];
}) {
  const { call, error, busy } = useCall();
  const [lines, setLines] = useState([{ itemId: "", qty: "1", unitCost: "" }]);
  const [open, setOpen] = useState(false);
  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * Number(l.unitCost.replace(/[^0-9]/g, "") || 0), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
      <div className="grid gap-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <section className="rise rounded-[2rem] bg-chalk p-5">
          <h2 className="font-extrabold">Supplier</h2>
          <ul className="mt-2 grid gap-1">
            {suppliers.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-mist py-2 text-sm">
                <span className="font-bold">{s.name}{s.phone ? <span className="font-normal text-ink-soft"> · {s.phone}</span> : null}</span>
                {s.owed ? <span className="font-bold text-flame">Utang {rupiah(s.owed)}</span> : null}
              </li>
            ))}
          </ul>
          <form
            className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            onSubmit={async (e) => {
              e.preventDefault();
              const el = e.currentTarget;
              const f = new FormData(el);
              if (await call("/suppliers", { name: f.get("name"), phone: f.get("phone") })) el.reset();
            }}
          >
            <input name="name" placeholder="Nama supplier" aria-label="Nama supplier" className={cell} />
            <input name="phone" placeholder="No. HP (boleh kosong)" aria-label="No. HP" className={cell} />
            <Button size="sm" type="submit" variant="outline" disabled={busy}>Tambah</Button>
          </form>
        </section>
        {suppliers.length && items.length ? (
          open ? (
            <form
              className="rise grid gap-3 rounded-[2rem] bg-chalk p-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const ok = await call("/purchases", {
                  supplierId: f.get("supplierId"), orderedOn: f.get("orderedOn"), note: f.get("note"),
                  lines: lines.filter((l) => l.itemId).map((l) => ({ itemId: l.itemId, qty: l.qty, unitCost: l.unitCost.replace(/[^0-9]/g, "") || "0" })),
                });
                if (ok) { setOpen(false); setLines([{ itemId: "", qty: "1", unitCost: "" }]); }
              }}
            >
              <h2 className="font-extrabold">Pesan barang</h2>
              <div className="grid grid-cols-2 gap-2">
                <select name="supplierId" aria-label="Supplier" className={cell} defaultValue="">
                  <option value="" disabled>Supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input type="date" name="orderedOn" defaultValue={today} max={today} aria-label="Tanggal pesan" className={cell} />
              </div>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_4rem_6.5rem_auto] gap-2">
                  <select aria-label="Barang" value={l.itemId} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, itemId: e.target.value } : y)))} className={cell}>
                    <option value="">Barang</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                  </select>
                  <input aria-label="Jumlah" inputMode="numeric" value={l.qty} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, qty: e.target.value.replace(/[^0-9]/g, "") } : y)))} className={cell} />
                  <input aria-label="Harga satuan" inputMode="numeric" placeholder="Harga/unit" value={l.unitCost} onChange={(e) => setLines((x) => x.map((y, j) => (j === i ? { ...y, unitCost: e.target.value } : y)))} className={cell} />
                  <Button size="sm" variant="ghost" aria-label="Hapus baris" disabled={lines.length === 1} onClick={() => setLines((x) => x.filter((_, j) => j !== i))}><Trash2 aria-hidden className="size-4" /></Button>
                </div>
              ))}
              <Button size="sm" variant="ghost" className="justify-self-start" onClick={() => setLines((x) => [...x, { itemId: "", qty: "1", unitCost: "" }])}>Tambah baris</Button>
              <input name="note" placeholder="Catatan (boleh kosong)" aria-label="Catatan" className={cell} />
              <p className="font-extrabold">Total {rupiah(total)}</p>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>Simpan pesanan</Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
              </div>
            </form>
          ) : (
            <Button className="justify-self-start" onClick={() => setOpen(true)}><Plus aria-hidden className="size-5" /> Pesan barang</Button>
          )
        ) : (
          <p className="text-sm text-ink-soft">Tambahkan supplier dan barang dulu untuk mencatat pembelian.</p>
        )}
      </div>
      <section className="grid gap-2">
        {purchases.length === 0 ? <EmptyState title="Belum ada pembelian">Pesanan ke supplier muncul di sini. Stok bertambah saat barang diterima.</EmptyState> : null}
        {purchases.map((p) => (
          <article key={p.id} className={`rise rounded-[1.5rem] bg-chalk p-4 ${p.status === "cancelled" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 font-extrabold">{p.supplierName}</span>
              <span className="rounded-full bg-mist px-2.5 py-0.5 text-xs font-bold">{PO_STATUS[p.status]}</span>
              {p.status === "received" ? (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${p.paidOn ? "bg-turf-soft text-pitch" : "bg-flame/15 text-flame"}`}>{p.paidOn ? "Lunas" : "Belum dibayar"}</span>
              ) : null}
            </div>
            <p className="text-xs text-ink-soft">{fmt(p.orderedOn)}{p.note ? ` · ${p.note}` : ""}</p>
            <ul className="mt-2 text-sm">
              {p.lines.map((l, i) => <li key={i}>{l.qty} × {l.itemName} @ {rupiah(l.unitCost)}</li>)}
            </ul>
            <p className="mt-1 font-bold">{rupiah(p.total)}</p>
            {p.status === "ordered" ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => call(`/purchases/${p.id}`, { action: "receive", date: today })}>Barang diterima</Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm("Batalkan pesanan ini?") && call(`/purchases/${p.id}`, { action: "cancel", date: today })}>Batalkan</Button>
              </div>
            ) : null}
            {p.status === "received" && !p.paidOn ? (
              <form
                className="mt-2 flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  call(`/purchases/${p.id}`, { action: "pay", date: f.get("date"), accountId: f.get("accountId") });
                }}
              >
                <input type="date" name="date" defaultValue={today} max={today} aria-label="Tanggal bayar" className={`${cell} w-40`} />
                <select name="accountId" aria-label="Dibayar dari" className={`${cell} w-28`}>
                  {cash.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <Button size="sm" type="submit" disabled={busy}>Bayar supplier</Button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

// ---------- Stok opname ----------

export function CountPanel({ items }: { items: ItemRow[] }) {
  const { call, error, busy } = useCall();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string>();
  const changed = items.filter((i) => counts[i.id] !== undefined && counts[i.id] !== "" && Number(counts[i.id]) !== i.qty);

  if (!items.length) return <EmptyState title="Belum ada barang">Tambahkan barang dulu di tab Barang.</EmptyState>;
  return (
    <form
      className="rise grid gap-3 rounded-[2rem] bg-chalk p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!changed.length) return setDone("Tidak ada selisih. Stok sudah cocok.");
        if (!confirm(`Simpan hasil hitung untuk ${changed.length} barang? Selisihnya dicatat di pembukuan.`)) return;
        if (await call("/stock/count", { counts: changed.map((i) => ({ itemId: i.id, qty: counts[i.id] })) })) {
          setCounts({});
          setDone(`${changed.length} barang disesuaikan.`);
        }
      }}
    >
      <p className="text-sm text-ink-soft">Hitung barang di gudang, lalu isi jumlah sebenarnya. Biarkan kosong bila sama dengan catatan.</p>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}
      <ul className="grid gap-1">
        {items.map((i) => {
          const v = counts[i.id];
          const diff = v !== undefined && v !== "" ? Number(v) - i.qty : 0;
          return (
            <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2 border-b border-mist py-2">
              <span className="min-w-0 font-bold break-words">{i.name}<span className="block text-xs font-normal text-ink-soft">Catatan: {i.qty} {i.unit}</span></span>
              <input
                inputMode="numeric"
                aria-label={`Jumlah fisik ${i.name}`}
                placeholder={String(i.qty)}
                value={v ?? ""}
                onChange={(e) => setCounts((c) => ({ ...c, [i.id]: e.target.value.replace(/[^0-9]/g, "") }))}
                className={cell}
              />
              <span className={`text-right text-sm font-bold tabular-nums ${diff < 0 ? "text-flame" : diff > 0 ? "text-pitch" : "text-ink-soft"}`}>{diff ? (diff > 0 ? `+${diff}` : diff) : "-"}</span>
            </li>
          );
        })}
      </ul>
      <Button type="submit" className="justify-self-start" disabled={busy}>Simpan hasil hitung</Button>
    </form>
  );
}

// ---------- Aset tetap ----------

export function AssetsPanel({ today, data, cash }: { today: string; data: { assets: AssetRow[]; lastRun: string | null }; cash: Opt[] }) {
  const { call, error, busy } = useCall();
  const [msg, setMsg] = useState<string>();
  const month = today.slice(0, 7);
  const ran = data.lastRun === month;
  const total = data.assets.reduce((s, a) => s + a.bookValue, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
      <form
        className="rise grid gap-3 rounded-[2rem] bg-chalk p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const el = e.currentTarget;
          const f = new FormData(el);
          const ok = await call("/assets", {
            name: f.get("name"), acquiredOn: f.get("acquiredOn"), cost: digits(f.get("cost")), salvage: digits(f.get("salvage")) || "0",
            usefulMonths: digits(f.get("years")) ? String(Number(digits(f.get("years"))) * 12) : "", paidFrom: f.get("paidFrom"),
          });
          if (ok) el.reset();
        }}
      >
        <h2 className="font-extrabold">Catat aset</h2>
        <p className="text-sm text-ink-soft">Barang tahan lama bernilai besar: gawang, mesin pelontar bola, mobil, renovasi.</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <label className="grid gap-1 text-sm font-bold">Nama aset<input name="name" placeholder="Gawang portabel" className={cell} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-sm font-bold">Harga beli (Rp)<input name="cost" inputMode="numeric" className={cell} /></label>
          <label className="grid gap-1 text-sm font-bold">Tanggal beli<input type="date" name="acquiredOn" defaultValue={today} max={today} className={cell} /></label>
          <label className="grid gap-1 text-sm font-bold">Umur pakai (tahun)<input name="years" inputMode="numeric" placeholder="3" className={cell} /></label>
          <label className="grid gap-1 text-sm font-bold">Nilai sisa (Rp)<input name="salvage" inputMode="numeric" placeholder="0" className={cell} /></label>
        </div>
        <label className="grid gap-1 text-sm font-bold">
          Dibayar dari
          <select name="paidFrom" className={cell} defaultValue={cash[0]?.id}>
            {cash.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value="">Belum dibayar (utang)</option>
          </select>
        </label>
        <Button type="submit" className="justify-self-start" disabled={busy}>Simpan aset</Button>
      </form>
      <section className="grid gap-3">
        <div className="rise flex flex-wrap items-center gap-2 rounded-[1.5rem] bg-chalk p-4">
          <span className="min-w-0 flex-1 text-sm">
            Nilai buku <b>{rupiah(total)}</b>
            <br />
            <span className="text-ink-soft">Penyusutan terakhir: {data.lastRun ? monthLabel(data.lastRun) : "belum pernah"}</span>
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || ran || data.assets.length === 0}
            onClick={async () => {
              const r = await api<{ total: number }>("/depreciation", { body: { month } });
              if (!r.ok) return setMsg(r.error.message);
              setMsg(`Penyusutan ${monthLabel(month)}: ${rupiah(r.data.total)} dicatat.`);
              location.reload();
            }}
          >
            {ran ? "Bulan ini sudah disusutkan" : `Catat penyusutan ${monthLabel(month)}`}
          </Button>
        </div>
        {msg ? <Alert tone="info">{msg}</Alert> : null}
        {data.assets.length === 0 ? <EmptyState title="Belum ada aset">Aset menyusut otomatis tiap bulan dengan metode garis lurus.</EmptyState> : null}
        {data.assets.map((a) => (
          <article key={a.id} className="rise rounded-[1.5rem] bg-chalk p-4">
            <p className="font-extrabold">{a.name}</p>
            <p className="text-xs text-ink-soft">Dibeli {fmt(a.acquiredOn)} · umur {Math.round((a.usefulMonths / 12) * 10) / 10} tahun</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
              <div className="h-full bg-pitch" style={{ width: `${Math.min(100, (a.depreciated / Math.max(1, a.cost - a.salvage)) * 100)}%` }} />
            </div>
            <p className="mt-1 flex flex-wrap justify-between gap-2 text-sm">
              <span>Harga {rupiah(a.cost)}</span>
              <span className="font-bold">Nilai buku {rupiah(a.bookValue)}</span>
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
