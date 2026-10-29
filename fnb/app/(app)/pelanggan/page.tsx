import { can } from "@/server/context";
import { listCustomers } from "@/server/promos";
import { requireFnbPage } from "@/server/routing";
import { redirect } from "next/navigation";
import { CustomerPanel } from "./customer-panel";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await requireFnbPage();
  if (!can(ctx, "orders.sell")) redirect("/");
  const { q } = await searchParams;
  return <main className="mx-auto max-w-4xl p-4 sm:p-8">
    <p className="font-bold text-tomato">Penjualan</p>
    <h1 className="text-3xl font-extrabold">Pelanggan</h1>
    <p className="mt-1 text-stone-600">Pilih pelanggan di kasir untuk melihat berapa kali mereka belanja dan total belanjanya.</p>
    <form className="mt-4 flex gap-2"><input name="q" defaultValue={q} aria-label="Cari" placeholder="Cari nama atau nomor telepon" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3" /><button className="h-11 rounded-full bg-kitchen px-5 text-sm font-bold text-white">Cari</button></form>
    <CustomerPanel initial={await listCustomers(ctx, q)} />
  </main>;
}
