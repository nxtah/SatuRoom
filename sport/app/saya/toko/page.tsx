import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { parentStore } from "@/server/store-parent";
import { ParentShop } from "./shop";

export const metadata: Metadata = { title: "Toko akademi" };

export default async function PlayerStorePage() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const store = await parentStore(session).catch(() => null);
  if (!store) redirect("/saya");
  return (
    <div className="grid gap-4">
      <div className="rise">
        <p className="text-sm font-bold text-turf">Perlengkapan</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Toko akademi</h1>
        <p className="mt-1 text-ink-soft">Pesan di sini, lalu bayar tunai atau transfer ke akademi. Barang diambil setelah pembayaran dicatat staf.</p>
      </div>
      <ParentShop items={store.items} orders={store.orders} />
    </div>
  );
}
