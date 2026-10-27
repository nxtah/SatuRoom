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

export function OrdersList({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");

  async function setStatus(id: string, status: "served" | "completed" | "cancelled") {
    setError("");
    const res = await fetch(`/api/v1/orders/${id}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Status belum dapat diubah."); return; }
    const fresh = await fetch("/api/v1/orders?scope=all");
    if (fresh.ok) setOrders(await fresh.json());
  }

  return <>
    {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
    <div className="mt-6 grid gap-3">
      {orders.map((o) => <article key={o.id} className="rounded-[1.5rem] bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-lg">#{o.number}</b>
          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${TONE[o.status] ?? "bg-stone-100 text-stone-600"}`}>{LABEL[o.status] ?? o.status}</span>
          <span className="text-sm text-stone-500">{o.type === "dine_in" ? "Dine in" : o.type === "takeaway" ? "Bungkus" : "Ambil"}{o.tableName ? ` · ${o.tableName}` : ""}</span>
          {o.customerName ? <span className="text-sm text-stone-500">· {o.customerName}</span> : null}
          <b className="ml-auto">{rupiah(o.total)}</b>
        </div>
        <p className="mt-2 text-sm text-stone-500">{o.lines.map((l) => `${l.qty}x ${l.name}`).join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {o.status === "ready" ? <button onClick={() => setStatus(o.id, "served")} className="h-9 rounded-full bg-basil px-4 text-sm font-bold text-white">Sajikan</button> : null}
          {o.status === "served" ? <button onClick={() => setStatus(o.id, "completed")} className="h-9 rounded-full bg-kitchen px-4 text-sm font-bold text-white">Selesaikan</button> : null}
          {["confirmed", "preparing"].includes(o.status) ? <button onClick={() => setStatus(o.id, "cancelled")} className="h-9 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700">Batalkan</button> : null}
        </div>
      </article>)}
      {!orders.length ? <p className="rounded-[2rem] bg-white p-10 text-center text-stone-500">Belum ada pesanan.</p> : null}
    </div>
  </>;
}
