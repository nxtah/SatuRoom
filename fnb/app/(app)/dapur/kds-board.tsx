"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Order } from "@/server/orders";

type Col = "confirmed" | "preparing" | "ready";
const COLUMNS: { key: Col; title: string; hint: string }[] = [
  { key: "confirmed", title: "Baru", hint: "Belum dikerjakan" },
  { key: "preparing", title: "Dimasak", hint: "Sedang dikerjakan" },
  { key: "ready", title: "Siap", hint: "Tinggal disajikan" },
];
const RANK: Record<string, number> = { confirmed: 0, preparing: 1, ready: 2, served: 3 };
const HOLD_MS = 260;

type Drag = { id: string; x: number; y: number; offX: number; offY: number; w: number; over: string | null };

/**
 * Papan tiket dapur. Kartu bisa ditahan lalu digeser ke kolom berikutnya (sentuh: tahan sebentar; mouse: tarik).
 * Tombol di kartu tetap ada sebagai cara lain, dan di HP kolom ditampilkan satu per satu lewat tab yang juga menjadi sasaran lepas.
 */
export function KdsBoard({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");
  const [station, setStation] = useState("");
  const [tab, setTab] = useState<Col>("confirmed");
  const [now, setNow] = useState(() => Date.now());
  const [drag, setDrag] = useState<Drag | null>(null);
  const press = useRef<{ id: string; x: number; y: number; offX: number; offY: number; w: number; touch: boolean; active: boolean; timer?: number } | null>(null);
  const moveRef = useRef<(id: string, to: string) => void>(() => {});
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current || press.current?.active) return;
    const res = await fetch("/api/v1/orders").catch(() => null);
    if (res?.ok) setOrders(await res.json());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { void load(); setNow(Date.now()); }, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const visible = orders
    .map((o) => ({ ...o, lines: station ? o.lines.filter((l) => (l.stationName ?? "Tanpa station") === station) : o.lines }))
    .filter((o) => o.lines.length);

  async function call(url: string, status: string) {
    const res = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Status belum dapat diubah.");
  }

  /** Pindahkan seluruh pesanan (item yang terlihat) ke kolom tujuan. Hanya maju, tidak mundur. */
  async function moveOrder(id: string, to: string) {
    const o = visible.find((x) => x.id === id);
    if (!o || !(to in RANK) || RANK[to]! <= RANK[o.status]!) return;
    if (to === "served" && o.status !== "ready") return;
    setError(""); busy.current = true;
    const target = to === "served" ? "served" : (to as "preparing" | "ready");
    const shown = new Set(o.lines.map((l) => l.id));
    setOrders((prev) => prev.map((x) => x.id !== id ? x : { ...x, status: station ? x.status : to, lines: x.lines.map((l) => shown.has(l.id) && to !== "served" && RANK[l.status]! < RANK[target]! ? { ...l, status: target } : l) }));
    try {
      if (to === "served") await call(`/api/v1/orders/${id}/status`, "served");
      else for (const l of o.lines.filter((l) => RANK[l.status]! < RANK[target]!)) await call(`/api/v1/order-lines/${l.id}/status`, target);
    } catch (e) { setError(e instanceof Error ? e.message : "Status belum dapat diubah."); }
    busy.current = false;
    await load();
  }
  useEffect(() => { moveRef.current = (id, to) => void moveOrder(id, to); });

  async function setLine(lineId: string, status: "preparing" | "ready") {
    setError(""); busy.current = true;
    try { await call(`/api/v1/order-lines/${lineId}/status`, status); } catch (e) { setError(e instanceof Error ? e.message : "Status belum dapat diubah."); }
    busy.current = false; await load();
  }

  // Penggeser global: aktif selama jari/mouse bergerak di mana saja di layar.
  useEffect(() => {
    const colAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest("[data-col]")?.getAttribute("data-col") ?? null;
    const onMove = (e: PointerEvent) => {
      const p = press.current; if (!p) return;
      if (!p.active) {
        const far = Math.hypot(e.clientX - p.x, e.clientY - p.y) > (p.touch ? 10 : 5);
        if (!far) return;
        if (p.touch) { window.clearTimeout(p.timer); press.current = null; return; } // gerak sebelum ditahan = menggulir
        p.active = true;
      }
      setDrag({ id: p.id, x: e.clientX, y: e.clientY, offX: p.offX, offY: p.offY, w: p.w, over: colAt(e.clientX, e.clientY) });
    };
    const end = (e: PointerEvent) => {
      const p = press.current; if (!p) return;
      window.clearTimeout(p.timer); press.current = null;
      if (p.active) { setDrag(null); if (e.type === "pointerup") { const to = colAt(e.clientX, e.clientY); if (to) moveRef.current(p.id, to); } }
    };
    const stopScroll = (e: TouchEvent) => { if (press.current?.active && e.cancelable) e.preventDefault(); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    window.addEventListener("touchmove", stopScroll, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end); window.removeEventListener("touchmove", stopScroll);
    };
  }, []);

  function down(e: React.PointerEvent<HTMLElement>, id: string) {
    if ((e.target as HTMLElement).closest("button,a,input")) return;
    const r = e.currentTarget.getBoundingClientRect();
    const touch = e.pointerType !== "mouse";
    const p = { id, x: e.clientX, y: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, w: r.width, touch, active: false, timer: undefined as number | undefined };
    press.current = p;
    if (touch) p.timer = window.setTimeout(() => {
      if (press.current !== p) return;
      p.active = true; navigator.vibrate?.(12);
      setDrag({ id, x: p.x, y: p.y, offX: p.offX, offY: p.offY, w: p.w, over: null });
    }, HOLD_MS);
  }

  const stations = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.stationName ?? "Tanpa station")))].sort();
  const minutes = (iso: string) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  const dragged = drag ? visible.find((o) => o.id === drag.id) : null;
  const canDrop = (to: string) => Boolean(dragged) && RANK[to]! > RANK[dragged!.status]! && (to !== "served" || dragged!.status === "ready");
  const inCol = (c: Col) => visible.filter((o) => o.status === c);

  const card = (o: (typeof visible)[number], col: Col) => <article key={o.id} onPointerDown={(e) => down(e, o.id)} onContextMenu={(e) => e.preventDefault()}
    style={{ touchAction: "pan-y" }}
    className={`cursor-grab rounded-2xl bg-plate p-4 text-ink select-none active:cursor-grabbing ${drag?.id === o.id ? "opacity-35" : ""}`}>
    <div className="flex items-center justify-between gap-2">
      <b>{o.receiptNo}</b>
      <span className="min-w-0 truncate text-xs font-bold text-stone-500">{o.typeName ?? (o.type === "dine_in" ? "Makan di tempat" : o.type === "takeaway" ? "Bungkus" : "Ambil sendiri")}{o.tableName ? ` · ${o.tableName}` : ""}</span>
    </div>
    <p className="text-xs text-stone-500"><span className={minutes(o.openedAt) >= 15 ? "font-bold text-tomato" : ""}>{minutes(o.openedAt)} menit</span>{o.customerName ? ` · ${o.customerName}` : ""}</p>
    <ul className="mt-2 grid gap-1.5">
      {o.lines.map((l) => <li key={l.id} className="flex items-center gap-2 rounded-xl bg-white p-2">
        <span className="min-w-0 flex-1 text-sm"><b>{l.qty}x</b> {l.name}{l.modifiers.length ? <span className="block text-xs font-bold text-kitchen">{l.modifiers.map((m) => m.name).join(", ")}</span> : null}{l.notes ? <em className="block text-xs font-bold text-tomato">{l.notes}</em> : null}</span>
        {l.status === "ready" ? <span className="rounded-full bg-basil/10 px-2 py-0.5 text-xs font-bold text-basil">siap</span>
          : <button onClick={() => setLine(l.id, l.status === "confirmed" ? "preparing" : "ready")} className="h-9 rounded-full bg-kitchen px-3.5 text-xs font-bold text-white">{l.status === "confirmed" ? "Mulai" : "Siap"}</button>}
      </li>)}
    </ul>
    {col === "confirmed" ? <button onClick={() => void moveOrder(o.id, "preparing")} className="mt-2 h-10 w-full rounded-full bg-kitchen text-xs font-extrabold text-white">Mulai semua</button> : null}
    {col === "preparing" ? <button onClick={() => void moveOrder(o.id, "ready")} className="mt-2 h-10 w-full rounded-full bg-saffron text-xs font-extrabold text-kitchen">Semua siap</button> : null}
    {col === "ready" ? <button onClick={() => void moveOrder(o.id, "served")} className="mt-2 h-10 w-full rounded-full bg-basil text-xs font-extrabold text-white">Sajikan</button> : null}
  </article>;

  return <>
    {stations.length > 1 ? <nav aria-label="Station" className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {["", ...stations].map((name) => <button key={name} onClick={() => setStation(name)} className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold ${station === name ? "bg-saffron text-kitchen" : "bg-white/10 text-white"}`}>{name || "Semua station"}</button>)}
    </nav> : null}
    {error ? <p role="alert" className="mt-4 rounded-2xl bg-tomato/20 p-3 text-sm font-bold text-white">{error}</p> : null}
    <p className="mt-3 text-xs text-white/55">Tahan kartu lalu geser ke kolom berikutnya, atau pakai tombol di kartu.</p>

    <div role="tablist" aria-label="Kolom dapur" className="sticky top-16 z-10 mt-3 grid grid-cols-3 gap-2 bg-kitchen/95 py-2 backdrop-blur md:hidden">
      {COLUMNS.map((c) => <button key={c.key} role="tab" aria-selected={tab === c.key} data-col={c.key} onClick={() => setTab(c.key)}
        className={`flex h-12 items-center justify-center gap-1.5 rounded-2xl text-sm font-extrabold ${drag?.over === c.key && canDrop(c.key) ? "bg-basil text-white ring-2 ring-white" : tab === c.key ? "bg-saffron text-kitchen" : "bg-white/10 text-white"}`}>
        {c.title}<span className="rounded-full bg-black/15 px-2 text-xs">{inCol(c.key).length}</span>
      </button>)}
    </div>

    <div className="mt-3 grid gap-4 md:mt-6 md:grid-cols-3">
      {COLUMNS.map((c) => {
        const list = inCol(c.key);
        const hot = drag?.over === c.key && canDrop(c.key);
        return <section key={c.key} data-col={c.key} aria-label={c.title} className={`min-h-56 min-w-0 rounded-[1.5rem] p-3 transition sm:p-4 ${tab === c.key ? "block" : "hidden md:block"} ${hot ? "bg-basil/30 ring-2 ring-saffron" : drag && canDrop(c.key) ? "bg-white/12 ring-1 ring-white/30" : "bg-white/8"}`}>
          <h2 className="hidden items-center gap-2 font-extrabold text-saffron md:flex">{c.title}<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">{list.length}</span><span className="ml-auto text-xs font-semibold text-white/50">{c.hint}</span></h2>
          <div className="grid gap-3 md:mt-3">
            {list.map((o) => card(o, c.key))}
            {!list.length ? <p className="py-10 text-center text-sm text-white/50">{drag && canDrop(c.key) ? "Lepas di sini" : "Kosong"}</p> : null}
          </div>
        </section>;
      })}
    </div>

    {dragged?.status === "ready" ? <div data-col="served" className={`fixed inset-x-4 bottom-24 z-40 grid h-16 place-items-center rounded-3xl text-center text-sm font-extrabold shadow-xl md:inset-x-auto md:right-8 md:bottom-8 md:w-80 ${drag?.over === "served" ? "bg-basil text-white ring-4 ring-white" : "bg-basil/85 text-white"}`}>Lepas di sini untuk Sajikan</div> : null}

    {drag && dragged ? <div aria-hidden style={{ left: drag.x - drag.offX, top: drag.y - drag.offY, width: Math.min(drag.w, 250) }} className="pointer-events-none fixed z-50 rotate-2 rounded-2xl bg-plate p-4 text-ink shadow-2xl ring-2 ring-saffron">
      <b>{dragged.receiptNo}</b>
      <p className="text-xs text-stone-500">{dragged.lines.length} item{dragged.tableName ? ` · ${dragged.tableName}` : ""}</p>
      <p className="mt-1 truncate text-sm">{dragged.lines.map((l) => `${l.qty}x ${l.name}`).join(", ")}</p>
    </div> : null}
  </>;
}
