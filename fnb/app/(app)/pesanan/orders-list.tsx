"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Order } from "@/server/orders";
import type { DiningTable } from "@/server/tables";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const LABEL: Record<string, string> = {
  open: "Baru", confirmed: "Baru", preparing: "Dimasak", ready: "Siap", served: "Disajikan", completed: "Selesai", cancelled: "Batal",
};
const TONE: Record<string, string> = {
  confirmed: "bg-saffron/20 text-kitchen", preparing: "bg-saffron/20 text-kitchen", ready: "bg-basil/10 text-basil",
  served: "bg-stone-100 text-stone-600", completed: "bg-basil/10 text-basil", cancelled: "bg-red-50 text-red-700", open: "bg-stone-100 text-stone-600",
};
const METHODS: [string, string][] = [["cash", "Tunai"], ["transfer", "Transfer"], ["qris", "QRIS"], ["card", "Kartu"]];

export function OrdersList({ initialOrders, tables, canPay, canArrange }: { initialOrders: Order[]; tables: DiningTable[]; canPay: boolean; canArrange: boolean }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [payFor, setPayFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [arrange, setArrange] = useState<{ id: string; mode: "move" | "merge" | "split" } | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const ACTIVE = ["confirmed", "preparing", "ready", "served"];

  async function arrangeCall(path: string, body: unknown, done: string) {
    setError(""); setMessage(""); setBusy(true);
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (!res) return setError("Koneksi terputus. Coba lagi.");
    if (!res.ok) return setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Belum dapat diproses.");
    setArrange(null); setPick([]); setMessage(done);
    await reload();
    router.refresh();
  }
  const [tendered, setTendered] = useState("");
  const [payKey, setPayKey] = useState("");
  const [cancelFor, setCancelFor] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  async function reload() {
    const fresh = await fetch("/api/v1/orders?scope=all");
    if (fresh.ok) setOrders(await fresh.json());
  }

  async function setStatus(id: string, status: "served" | "completed" | "cancelled", reason?: string) {
    setError(""); setMessage("");
    const res = await fetch(`/api/v1/orders/${id}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status, reason }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Status belum dapat diubah."); return; }
    setCancelFor(null); setCancelReason("");
    await reload();
  }

  async function pay(order: Order) {
    setBusy(true); setError(""); setMessage("");
    const res = await fetch("/api/v1/payments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, amount: Number(amount || 0), method, tendered: method === "cash" && tendered ? Number(tendered) : undefined, idempotencyKey: payKey }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPayFor(null); setAmount(""); setTendered("");
      setMessage(data.completed ? `Pesanan ${order.receiptNo} lunas.${data.change > 0 ? ` Kembalian ${rupiah(data.change)}.` : ""}` : `Pembayaran diterima. Sisa ${rupiah(data.remaining)}.`);
      await reload();
    } else setError(data.error ?? "Pembayaran belum dapat disimpan.");
    setBusy(false);
  }

  return <>
    {message ? <p className="mt-4 rounded-2xl bg-basil/10 p-4 text-sm font-bold text-basil">{message}</p> : null}
    {error ? <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
    <div className="mt-6 grid gap-3">
      {orders.map((o) => {
        const remaining = Math.max(0, o.total - o.paid);
        const paidOff = o.total > 0 && remaining === 0;
        return <article key={o.id} className="rounded-[1.5rem] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-lg">{o.receiptNo}</b>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE[o.status] ?? "bg-stone-100 text-stone-600"}`}>{LABEL[o.status] ?? o.status}</span>
            {paidOff ? <span className="rounded-full bg-basil px-2.5 py-1 text-xs font-bold text-white">Lunas</span> : null}
            <span className="text-sm text-stone-500">{o.type === "dine_in" ? "Dine in" : o.type === "takeaway" ? "Bungkus" : "Ambil"}{o.tableName ? ` · ${o.tableName}` : ""}</span>
            {o.customerName ? <span className="text-sm text-stone-500">· {o.customerName}</span> : null}
            <b className="ml-auto">{rupiah(o.total)}</b>
          </div>
          <p className="mt-2 text-sm text-stone-500">{o.lines.map((l) => `${l.qty}x ${l.name}${l.modifiers.length ? ` (${l.modifiers.map((m) => m.name).join(", ")})` : ""}`).join(" · ")}</p>
          {o.discount > 0 || o.serviceCharge > 0 || o.tax > 0 ? <p className="mt-1 text-xs text-stone-500">Subtotal {rupiah(o.subtotal)}{o.discount > 0 ? ` · diskon -${rupiah(o.discount)}` : ""}{o.serviceCharge > 0 ? ` · service ${rupiah(o.serviceCharge)}` : ""}{o.tax > 0 ? ` · pajak ${rupiah(o.tax)}` : ""}</p> : null}
          {o.status === "cancelled" && o.cancelReason ? <p className="mt-1 text-xs text-red-700">Alasan batal: {o.cancelReason}</p> : null}
          {o.refunded > 0 ? <p className="mt-1 text-xs font-bold text-tomato">Di-refund {rupiah(o.refunded)}</p> : null}
          {o.paid > 0 && !paidOff ? <p className="mt-1 text-sm text-basil">Dibayar {rupiah(o.paid)} · sisa {rupiah(remaining)}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {canPay && !paidOff && ["ready", "served", "completed"].includes(o.status) ? <button onClick={() => { setPayFor(payFor === o.id ? null : o.id); setAmount(String(remaining)); setMethod("cash"); setTendered(""); setPayKey(crypto.randomUUID()); }} className="h-9 rounded-full bg-saffron px-4 text-sm font-extrabold text-kitchen">Terima bayar</button> : null}
            {o.status === "ready" ? <button onClick={() => setStatus(o.id, "served")} className="h-9 rounded-full bg-basil px-4 text-sm font-bold text-white">Sajikan</button> : null}
            {o.status === "served" && !paidOff ? <button onClick={() => setStatus(o.id, "completed")} className="h-9 rounded-full bg-kitchen px-4 text-sm font-bold text-white">Selesaikan</button> : null}
            {["confirmed", "preparing"].includes(o.status) ? <button onClick={() => { setCancelFor(cancelFor === o.id ? null : o.id); setCancelReason(""); }} className="h-9 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700">Batalkan</button> : null}
            {canArrange && ACTIVE.includes(o.status) && o.paid === 0 ? <>
              <button onClick={() => { setArrange(arrange?.id === o.id && arrange.mode === "move" ? null : { id: o.id, mode: "move" }); setPick([]); }} className="h-9 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700">Pindah meja</button>
              <button onClick={() => { setArrange(arrange?.id === o.id && arrange.mode === "merge" ? null : { id: o.id, mode: "merge" }); setPick([]); }} className="h-9 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700">Gabung</button>
              {o.lines.length > 1 ? <button onClick={() => { setArrange(arrange?.id === o.id && arrange.mode === "split" ? null : { id: o.id, mode: "split" }); setPick([]); }} className="h-9 rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700">Pisah tagihan</button> : null}
            </> : null}
            <a href={`/struk/${o.id}`} target="_blank" rel="noopener" className="inline-flex h-9 items-center rounded-full bg-stone-100 px-4 text-sm font-bold text-stone-700">Struk</a>
          </div>
          {arrange?.id === o.id ? <div className="mt-3 rounded-2xl bg-plate p-4">
            {arrange.mode === "move" ? <>
              <p className="text-sm font-bold">Pindah ke meja kosong</p>
              <div className="mt-2 flex flex-wrap gap-2">{tables.filter((t) => !t.order).map((t) => <button key={t.id} disabled={busy} onClick={() => arrangeCall(`/api/v1/orders/${o.id}/move`, { tableId: t.id }, `Pesanan dipindah ke ${t.name}.`)} className="h-10 rounded-full bg-white px-4 text-sm font-bold">{t.name}</button>)}
                {!tables.some((t) => !t.order) ? <span className="text-sm text-stone-600">Tidak ada meja kosong.</span> : null}</div>
            </> : null}
            {arrange.mode === "merge" ? <>
              <p className="text-sm font-bold">Gabungkan semua item ke pesanan:</p>
              <div className="mt-2 flex flex-wrap gap-2">{orders.filter((x) => x.id !== o.id && ACTIVE.includes(x.status) && x.paid === 0).map((x) => <button key={x.id} disabled={busy} onClick={() => arrangeCall(`/api/v1/orders/${o.id}/merge`, { targetId: x.id }, `Pesanan digabung ke ${x.receiptNo}.`)} className="h-10 rounded-full bg-white px-4 text-sm font-bold">{x.receiptNo}{x.tableName ? ` · ${x.tableName}` : ""}</button>)}</div>
              <p className="mt-2 text-xs text-stone-600">Pesanan ini ditutup setelah digabung. Pesanan ber-diskon atau yang sudah dibayar tidak bisa digabung.</p>
            </> : null}
            {arrange.mode === "split" ? <>
              <p className="text-sm font-bold">Pilih item untuk tagihan baru</p>
              <div className="mt-2 grid gap-1">{o.lines.map((l) => <label key={l.id} className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-kitchen" checked={pick.includes(l.id)} onChange={() => setPick(pick.includes(l.id) ? pick.filter((x) => x !== l.id) : [...pick, l.id])} />{l.qty}x {l.name}</label>)}</div>
              <button disabled={busy || !pick.length || pick.length >= o.lines.length} onClick={() => arrangeCall(`/api/v1/orders/${o.id}/split`, { lineIds: pick }, "Tagihan dipisah jadi pesanan baru.")} className="mt-3 h-10 rounded-full bg-kitchen px-5 text-sm font-bold text-white disabled:opacity-40">Pisahkan</button>
            </> : null}
          </div> : null}
          {cancelFor === o.id ? <div className="mt-3 flex flex-col gap-2 rounded-2xl bg-red-50 p-3 sm:flex-row">
            <input aria-label="Alasan pembatalan" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Alasan pembatalan" className="h-11 min-w-0 flex-1 rounded-xl border border-red-200 bg-white px-3" />
            <button disabled={cancelReason.trim().length < 3} onClick={() => setStatus(o.id, "cancelled", cancelReason.trim())} className="h-11 rounded-full bg-tomato px-6 font-extrabold text-white disabled:opacity-40">Batalkan pesanan</button>
          </div> : null}
          {payFor === o.id ? <div className="mt-3 rounded-2xl bg-plate p-4">
            <div className="flex flex-wrap gap-2">
              {METHODS.map(([value, label]) => <button key={value} onClick={() => setMethod(value)} className={`h-9 rounded-full px-4 text-sm font-bold ${method === value ? "bg-kitchen text-white" : "bg-white text-stone-600"}`}>{label}</button>)}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" placeholder="Nominal" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 px-3" />
              {method === "cash" ? <input value={tendered} onChange={(e) => setTendered(e.target.value)} type="number" min="0" placeholder="Uang diterima (opsional)" aria-label="Uang diterima" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 px-3" /> : null}
              <button onClick={() => pay(o)} disabled={busy} className="h-11 rounded-full bg-basil px-6 font-extrabold text-white disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan bayar"}</button>
            </div>
          </div> : null}
        </article>;
      })}
      {!orders.length ? <p className="rounded-[2rem] bg-white p-10 text-center text-stone-500">Belum ada pesanan.</p> : null}
    </div>
  </>;
}
