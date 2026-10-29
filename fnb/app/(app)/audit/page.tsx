import Link from "next/link";
import { redirect } from "next/navigation";
import { AUDIT_GROUPS, listAudit } from "@/server/audit";
import { can } from "@/server/context";
import { requireFnbPage } from "@/server/routing";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ jenis?: string }> }) {
  const ctx = await requireFnbPage();
  if (!can(ctx, "audit.read")) redirect("/");
  const { jenis = "" } = await searchParams;
  const rows = await listAudit(ctx, jenis);
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <p className="font-bold text-tomato">Keamanan</p>
    <h1 className="text-3xl font-extrabold">Jejak aktivitas</h1>
    <p className="mt-1 text-stone-600">Siapa melakukan apa dan kapan: diskon, refund, pembatalan, perubahan stok, dan lainnya. Tidak bisa diubah atau dihapus.</p>
    <nav aria-label="Saring jenis" className="mt-4 flex flex-wrap gap-2">
      {AUDIT_GROUPS.map(([value, label]) => <Link key={value} href={value ? `/audit?jenis=${value}` : "/audit"} className={`rounded-full px-4 py-2 text-sm font-bold ${jenis === value ? "bg-kitchen text-white" : "bg-white text-stone-600"}`}>{label}</Link>)}
    </nav>
    <ul className="mt-4 grid gap-2">
      {rows.map((r) => <li key={r.id} className="rounded-2xl bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <b>{r.label}</b>
          <span className="text-sm text-stone-600">{r.actor ?? "Sistem"}</span>
          <time className="ml-auto text-xs text-stone-600" dateTime={r.at}>{new Date(r.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}</time>
        </div>
        {Object.keys(r.meta).length ? <p className="mt-1 break-words text-xs text-stone-600">{Object.entries(r.meta).slice(0, 6).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ")}</p> : null}
      </li>)}
      {!rows.length ? <li className="rounded-[2rem] bg-white p-10 text-center text-stone-600">Belum ada aktivitas.</li> : null}
    </ul>
  </main>;
}
