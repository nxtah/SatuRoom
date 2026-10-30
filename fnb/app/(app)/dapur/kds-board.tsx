"use client";
import { useCallback, useEffect, useState } from "react";
import type { Order } from "@/server/orders";

const COLUMNS = [
  { key: "confirmed", title: "Baru" },
  { key: "preparing", title: "Dimasak" },
  { key: "ready", title: "Siap" },
] as const;

export function KdsBoard({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");
  const [station, setStation] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/orders");
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { void load(); setNow(Date.now()); }, 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function setLine(orderId: string, lineId: string, status: "preparing" | "ready") {
    setError("");
    const res = await fetch(`/api/v1/order-lines/${lineId}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Status belum dapat diubah."); return; }
    void orderId; await load();
  }

  async function serve(orderId: string) {
    const res = await fetch(`/api/v1/orders/${orderId}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: "served" }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Pesanan belum dapat disajikan."); return; }
    await load();
  }

  const stations = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.stationName ?? "Tanpa station")))].sort();
  const visible = orders
    .map((o) => ({ ...o, lines: station ? o.lines.filter((l) => (l.stationName ?? "Tanpa station") === station) : o.lines }))
    .filter((o) => o.lines.length);
  const minutes = (iso: string) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

  return <>
    {stations.length > 1 ? <nav aria-label="Station" className="mt-4 flex flex-wrap gap-2">
      {["", ...stations].map((name) => <button key={name} onClick={() => setStation(name)} className={`h-10 rounded-full px-4 text-sm font-bold ${station === name ? "bg-saffron text-kitchen" : "bg-white/10 text-white"}`}>{name || "Semua station"}</button>)}
    </nav> : null}
    {error ? <p className="mt-4 rounded-2xl bg-tomato/20 p-3 text-sm font-bold text-white">{error}</p> : null}
    <div className="mt-6 grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const list = visible.filter((o) => o.status === col.key);
        return <section key={col.key} className="rounded-[1.5rem] bg-white/8 p-4">
          <h2 className="flex items-center gap-2 font-extrabold text-saffron">{col.title}<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">{list.length}</span></h2>
          <div className="mt-3 grid gap-3">
            {list.map((o) => <article key={o.id} className="rounded-2xl bg-plate p-4 text-ink">
              <div className="flex items-center justify-between">
                <b>{o.receiptNo}</b>
                <span className="text-xs font-bold text-stone-500">{o.typeName ?? (o.type === "dine_in" ? "Makan di tempat" : o.type === "takeaway" ? "Bungkus" : "Ambil sendiri")}{o.tableName ? ` · ${o.tableName}` : ""}</span>
              </div>
              <p className="text-xs text-stone-500"><span className={minutes(o.openedAt) >= 15 ? "font-bold text-tomato" : ""}>{minutes(o.openedAt)} menit</span>{o.customerName ? ` · ${o.customerName}` : ""}</p>
              <ul className="mt-2 grid gap-1.5">
                {o.lines.map((l) => <li key={l.id} className="flex items-center gap-2 rounded-xl bg-white p-2">
                  <span className="min-w-0 flex-1 text-sm"><b>{l.qty}x</b> {l.name}{l.modifiers.length ? <span className="block text-xs font-bold text-kitchen">{l.modifiers.map((m) => m.name).join(", ")}</span> : null}{l.notes ? <em className="block text-xs font-bold text-tomato">Catatan: {l.notes}</em> : null}</span>
                  {l.status === "ready" ? <span className="rounded-full bg-basil/10 px-2 py-0.5 text-xs font-bold text-basil">siap</span>
                    : <button onClick={() => setLine(o.id, l.id, l.status === "confirmed" ? "preparing" : "ready")} className="rounded-full bg-kitchen px-3 py-1 text-xs font-bold text-white">
                        {l.status === "confirmed" ? "Mulai" : "Siap"}
                      </button>}
                </li>)}
              </ul>
              {o.status === "ready" ? <button onClick={() => serve(o.id)} className="mt-2 h-9 w-full rounded-full bg-basil text-xs font-extrabold text-white">Sajikan</button> : null}
            </article>)}
            {!list.length ? <p className="py-8 text-center text-sm text-white/50">Kosong</p> : null}
          </div>
        </section>;
      })}
    </div>
  </>;
}
