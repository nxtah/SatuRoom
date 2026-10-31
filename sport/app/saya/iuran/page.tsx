import type { Metadata } from "next";
import Link from "next/link";
import { currentSession } from "@/server/context";
import { parentStore } from "@/server/store-parent";
import { Fees } from "../page";
import { requirePlayerHome } from "../player-data";

export const metadata: Metadata = { title: "Iuran saya" };

export default async function PlayerFeesPage() {
  const me = await requirePlayerHome();
  const session = await currentSession();
  const store = session ? await parentStore(session).catch(() => null) : null;
  return (
    <div className="grid gap-4">
      <div className="rise">
        <p className="text-sm font-bold text-turf">Administrasi akademi</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Iuran saya</h1>
        <p className="mt-1 text-ink-soft">Pembayaran tetap dicatat oleh staf akademi setelah tunai atau transfer diterima.</p>
      </div>
      <div className="max-w-xl"><Fees me={me} /></div>
      {store ? (
      <Link href="/saya/toko" className="rise flex max-w-xl items-center justify-between rounded-[1.5rem] bg-chalk p-5 font-extrabold hover:bg-mist">
        Toko akademi: jersey dan perlengkapan <span aria-hidden>›</span>
      </Link>
      ) : null}
    </div>
  );
}
