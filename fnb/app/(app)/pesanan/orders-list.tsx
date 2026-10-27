"use client";
import { useState } from "react";
import type { Order } from "@/server/orders";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const LABEL: Record<string, string> = {
  open: "Baru", confirmed: "Baru", preparing: "Dimasak", ready: "Siap", served: "Disajikan", completed: "Selesai", cancelled: "Batal",
};
const TONE: Record<string, string> = {
  confirmed: "bg-saffron/20 text-kitchen", preparing: "bg-saffron/20 text-kitchen", ready: "bg-basil/10 text-basil",
  served: "bg-stone-100 text-stone-600", completed: "bg-basil/10 text-basil", cancelled: "bg-red-50 text-red-700", open: "bg-stone-100 text-stone-600",
};
const METHODS: [string, string][] = [["cash", "Tunai"], ["transfer", "Transfer"], ["qris", "QRIS"], ["card", "Kartu"]];

export function OrdersList({ initialOrders, canPay }: { initialOrders: Order[]; canPay: boolean }) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [payFor, setPayFor] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const fresh = await fetch("/api/v1/orders?scope=all");
    if (fresh.ok) setOrders(await fresh.json());
  }

  async function setStatus(id: string, status: "served" | "completed" | "cancelled") {
    setError(""); setMessage("");
    const res = await fetch(`/api/v1/orders/${id}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Status belum dapat diubah."); return; }
    await reload();
  }

  async function pay(order: Order) {
    setBusy(true); setError(""); setMessage("");
    const res = await fetch("/api/v1/payments", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, amount: Number(amount || 0), method }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setPayFor(null); setAmount("");
      setMessage(data.completed ? `Pesanan #${order.number} lunas.` : `Pembayaran diterima. Sisa ${rupiah(data.remaining)}.`);
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
            <b className="text-lg">#{o.number}</b>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE[o.status] ?? "bg-stone-100 text-stone-600"}`}>{LABEL[o.status] ?? o.status}</span>
            {paidOff ? <span className="rounded-full bg-basil px-2.5 py-1 text-xs font-bold text-white">Lunas</span> : null}
            <span className="text-sm text-stone-500">{o.type === "dine_in" ? "Dine in" : o.type === "takeaway" ? "Bungkus" : "Ambil"}{o.tableName ? ` · ${o.tableName}` : ""}</span>
            {o.customerName ? <span className="text-sm text-stone-500">· {o.customerName}</span> : null}
            <b className="ml-auto">{rupiah(o.total)}</b>
          </div>
          <p className="mt-2 text-sm text-stone-500">{o.lines.map((l) => `${l.qty}x ${l.name}`).join(" · ")}</p>
          {o.paid > 0 && !paidOff ? <p className="mt-1 text-sm text-basil">Dibayar {rupiah(o.paid)} · sisa {rupiah(remaining)}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {canPay && !paidOff && ["ready", "served", "completed"].includes(o.status) ? <button onClick={() => { setPayFor(payFor === o.id ? null : o.id); setAmount(String(remaining)); setMethod("cash"); }} className="h-9 rounded-full bg-saffron px-4 text-sm font-extrabold text-kitchen">Terima bayar</button> : null}
            {o.status === "ready" ? <button onClick={() => setStatus(o.id, "served")} className="h-9 rounded-full bg-basil px-4 text-sm font-bold text-white">Sajikan</button> : null}
            {o.status === "served" && !paidOff ? <button onClick={() => setStatus(o.id, "completed")} className="h-9 rounded-full bg-kitchen px-4 text-sm font-bold text-white">Selesaikan</button> : null}
            {["confirmed", "preparing"].includes(o.status) ? <button onClick={() => setStatus(o.id, "cancelled")} className="h-9 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700">Batalkan</button> : null}
          </div>
          {payFor === o.id ? <div className="mt-3 rounded-2xl bg-plate p-4">
            <div className="flex flex-wrap gap-2">
              {METHODS.map(([value, label]) => <button key={value} onClick={() => setMethod(value)} className={`h-9 rounded-full px-4 text-sm font-bold ${method === value ? "bg-kitchen text-white" : "bg-white text-stone-600"}`}>{label}</button>)}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" placeholder="Nominal" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 px-3" />
              <button onClick={() => pay(o)} disabled={busy} className="h-11 rounded-full bg-basil px-6 font-extrabold text-white disabled:opacity-40">{busy ? "Menyimpan…" : "Simpan bayar"}</button>
            </div>
          </div> : null}
        </article>;
      })}
      {!orders.length ? <p className="rounded-[2rem] bg-white p-10 text-center text-stone-500">Belum ada pesanan.</p> : null}
    </div>
  </>;
}
