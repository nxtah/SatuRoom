"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnAccent, btnPrimary, btnSoft, call, Field, input, Modal } from "@/components/ui";
import type { TableGroup } from "@/server/table-groups";
import type { DiningTable } from "@/server/tables";

type GroupDraft = { id?: string; name: string; sortOrder: string };
type TableDraft = { id?: string; name: string; capacity: string; groupId: string };

export function TableGroupManager({ groups, tables }: { groups: TableGroup[]; tables: DiningTable[] }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupDraft | null>(null);
  const [table, setTable] = useState<TableDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ error: string | null }>, done: () => void) {
    setBusy(true); setError("");
    const res = await fn();
    setBusy(false);
    if (res.error) return setError(res.error);
    done(); router.refresh();
  }
  const saveGroup = () => group && run(() => (group.id ? call(`/api/v1/table-groups/${group.id}`, "PUT", { name: group.name, sortOrder: Number(group.sortOrder) || 0 }) : call("/api/v1/table-groups", "POST", { name: group.name, sortOrder: Number(group.sortOrder) || 0 })), () => setGroup(null));
  const saveTable = () => table && run(() => { const b = { name: table.name, capacity: table.capacity ? Number(table.capacity) : null, groupId: table.groupId || null }; return table.id ? call(`/api/v1/tables/${table.id}`, "PUT", b) : call("/api/v1/tables", "POST", b); }, () => setTable(null));
  async function drop(url: string, text: string) {
    if (!confirm(text)) return;
    const res = await call(url, "DELETE");
    if (res.error) return alert(res.error);
    router.refresh();
  }
  const sections = [...groups.map((g) => ({ g, rows: tables.filter((t) => t.groupId === g.id) })), { g: null as TableGroup | null, rows: tables.filter((t) => !t.groupId) }];

  return <>
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <button onClick={() => { setError(""); setGroup({ name: "", sortOrder: String(groups.length + 1) }); }} className={btnSoft}><Plus aria-hidden className="size-4" />Grup baru</button>
      <button onClick={() => { setError(""); setTable({ name: "", capacity: "", groupId: groups[0]?.id ?? "" }); }} className={btnAccent}><Plus aria-hidden className="size-5" />Tambah meja</button>
    </div>
    <div className="mt-4 grid gap-4">
      {sections.map(({ g, rows }) => (g || rows.length) ? <section key={g?.id ?? "none"} className="rounded-[2rem] bg-white p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-lg font-extrabold">{g ? g.name : "Tanpa grup"} <span className="text-sm font-normal text-stone-500">· {rows.length} meja</span></h2>
          {g ? <><button onClick={() => { setError(""); setGroup({ id: g.id, name: g.name, sortOrder: String(g.sortOrder) }); }} className={btnSoft}>Ubah grup</button><button onClick={() => drop(`/api/v1/table-groups/${g.id}`, `Hapus grup ${g.name}? Mejanya tetap ada, hanya tanpa grup.`)} className="h-10 px-2 text-sm font-bold text-tomato">Hapus grup</button></> : null}
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-stone-50 p-3">
            <b className="min-w-0 flex-1 truncate">{t.name}</b>
            <span className="text-xs text-stone-600">{t.capacity ? `${t.capacity} kursi` : "Kursi bebas"}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${t.order ? "bg-saffron/25 text-kitchen" : "bg-basil/10 text-basil"}`}>{t.order ? "Terpakai" : "Kosong"}</span>
            <button onClick={() => { setError(""); setTable({ id: t.id, name: t.name, capacity: t.capacity ? String(t.capacity) : "", groupId: t.groupId ?? "" }); }} className="h-9 rounded-full bg-white px-4 text-sm font-bold">Ubah</button>
            <button disabled={!!t.order} onClick={() => drop(`/api/v1/tables/${t.id}`, `Hapus ${t.name}?`)} className="h-9 rounded-full bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-40">Hapus</button>
          </li>)}
          {!rows.length ? <li className="text-sm text-stone-500">Belum ada meja di grup ini.</li> : null}
        </ul>
      </section> : null)}
      {!tables.length && !groups.length ? <p className="rounded-[2rem] bg-white p-8 text-center text-stone-500">Belum ada meja. Buat grup (mis. Indoor) lalu tambahkan mejanya.</p> : null}
    </div>
    <Modal open={!!group} onClose={() => setGroup(null)} title={group?.id ? "Ubah grup meja" : "Grup meja baru"}>
      {group ? <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveGroup(); }}>
        <Field label="Nama grup"><input required maxLength={40} value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} className={input} /></Field>
        <Field label="Urutan tampil"><input type="number" min="0" value={group.sortOrder} onChange={(e) => setGroup({ ...group, sortOrder: e.target.value })} className={input} /></Field>
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan grup</button>
      </form> : null}
    </Modal>
    <Modal open={!!table} onClose={() => setTable(null)} title={table?.id ? "Ubah meja" : "Meja baru"}>
      {table ? <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); void saveTable(); }}>
        <Field label="Nama meja"><input required maxLength={40} placeholder="Meja 1" value={table.name} onChange={(e) => setTable({ ...table, name: e.target.value })} className={input} /></Field>
        <Field label="Jumlah kursi (opsional)"><input type="number" min="1" max="500" value={table.capacity} onChange={(e) => setTable({ ...table, capacity: e.target.value })} className={input} /></Field>
        <Field label="Grup"><select value={table.groupId} onChange={(e) => setTable({ ...table, groupId: e.target.value })} className={input}><option value="">Tanpa grup</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></Field>
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan meja</button>
      </form> : null}
    </Modal>
  </>;
}
