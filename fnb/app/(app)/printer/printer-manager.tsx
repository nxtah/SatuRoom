"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSoft, call, Field, input, Modal, Toggle } from "@/components/ui";
import type { Printer } from "@/server/printers";

const PURPOSE: Record<string, string> = { receipt: "Struk kasir", kitchen: "Tiket dapur", bar: "Tiket bar" };

export function PrinterManager({ initial }: { initial: Printer[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Printer | "new" | null>(null);
  const [isDefault, setDefault] = useState(false);
  const [isActive, setActive] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const target = edit && edit !== "new" ? edit : null;

  function open(p: Printer | "new") { setError(""); setDefault(p === "new" ? false : p.isDefault); setActive(p === "new" ? true : p.isActive); setEdit(p); }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const f = new FormData(e.currentTarget);
    const r = await call(target ? `/api/v1/printers/${target.id}` : "/api/v1/printers", target ? "PUT" : "POST", { name: f.get("name"), purpose: f.get("purpose"), paper: f.get("paper"), location: f.get("location"), copies: f.get("copies"), isDefault, isActive });
    setBusy(false);
    if (r.error) return setError(r.error);
    setEdit(null); router.refresh();
  }
  async function remove(p: Printer) {
    if (!confirm(`Hapus printer ${p.name}?`)) return;
    const r = await call(`/api/v1/printers/${p.id}`, "DELETE");
    if (r.error) setError(r.error); else router.refresh();
  }
  /** Uji cetak lewat dialog cetak browser dengan lebar kertas printer. */
  function testPrint(p: Printer) {
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) return setError("Izinkan jendela pop-up untuk uji cetak.");
    w.document.write(`<title>Uji cetak</title><style>@page{size:${p.paper}mm auto;margin:0}body{font-family:monospace;width:${p.paper === 58 ? "52mm" : "74mm"};margin:2mm;font-size:12px}</style><h3>UJI CETAK</h3><p>${p.name.replace(/[<>&]/g, "")}<br>${PURPOSE[p.purpose]} · kertas ${p.paper} mm</p><p>${"-".repeat(p.paper === 58 ? 24 : 36)}</p><p>Jika tulisan ini terbaca utuh dan tidak terpotong, pengaturan kertas sudah sesuai.</p>`);
    w.document.close(); w.focus(); w.print();
  }
  return <div className="mt-5 grid gap-4">
    <div className="flex justify-end"><button onClick={() => open("new")} className={btnPrimary}>Tambah printer</button></div>
    {error && !edit ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
    <ul className="grid gap-3">{initial.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[1.6rem] bg-white p-4">
      <div className="min-w-0 flex-1"><b>{p.name}</b>{p.isDefault ? <span className="ml-2 rounded-full bg-saffron/40 px-2 py-0.5 text-xs font-bold">Bawaan</span> : null}{!p.isActive ? <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold">Nonaktif</span> : null}
        <p className="text-sm text-stone-600">{PURPOSE[p.purpose]} · kertas {p.paper} mm · {p.copies} salinan{p.location ? ` · ${p.location}` : ""}</p></div>
      <button onClick={() => testPrint(p)} className={btnSoft}>Uji cetak</button>
      <button onClick={() => open(p)} className={btnSoft}>Ubah</button>
      <button onClick={() => remove(p)} className="text-sm font-bold text-chili">Hapus</button>
    </li>)}
      {!initial.length ? <li className="rounded-[2rem] bg-white p-10 text-center text-stone-500">Belum ada printer. Tanpa printer terdaftar, struk memakai lebar kertas dari menu Struk.</li> : null}</ul>
    <p className="rounded-2xl bg-cream p-4 text-sm text-stone-700">Cetak berjalan lewat dialog cetak browser di perangkat kasir. Sambungan langsung ke printer thermal (Bluetooth atau jaringan) belum tersedia; daftar ini mengatur lebar kertas dan peruntukan.</p>

    <Modal open={!!edit} onClose={() => setEdit(null)} title={target ? "Ubah printer" : "Tambah printer"}>
      <form key={target?.id ?? "new"} onSubmit={save} className="grid gap-3">
        <Field label="Nama printer"><input name="name" required defaultValue={target?.name} className={input} placeholder="Printer kasir" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fungsi"><select name="purpose" defaultValue={target?.purpose ?? "receipt"} className={input}>{Object.entries(PURPOSE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Lebar kertas"><select name="paper" defaultValue={target?.paper ?? 80} className={input}><option value={80}>80 mm</option><option value={58}>58 mm</option></select></Field>
          <Field label="Lokasi"><input name="location" defaultValue={target?.location ?? ""} className={input} placeholder="Kasir, dapur" /></Field>
          <Field label="Jumlah salinan"><input name="copies" type="number" min={1} max={5} defaultValue={target?.copies ?? 1} className={input} /></Field>
        </div>
        <Toggle checked={isDefault} onChange={setDefault} label="Printer bawaan untuk fungsi ini" />
        <Toggle checked={isActive} onChange={setActive} label="Aktif" />
        {error ? <p role="alert" className="text-sm font-bold text-red-700">{error}</p> : null}
        <button disabled={busy} className={btnPrimary}>Simpan</button>
      </form>
    </Modal>
  </div>;
}
