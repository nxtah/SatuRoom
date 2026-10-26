import type { Metadata } from "next";
import { Hero } from "../page";
import { requirePlayerHome } from "../player-data";

export const metadata: Metadata = { title: "Profil pemain" };

export default async function PlayerProfilePage() {
  const me = await requirePlayerHome();
  return (
    <div className="grid gap-4">
      <div className="rise">
        <p className="text-sm font-bold text-turf">Data pemain</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Profil saya</h1>
        <p className="mt-1 text-ink-soft">Butuh pembaruan data? Hubungi admin akademi.</p>
      </div>
      <Hero me={me} />
      <section className="rise max-w-xl rounded-[2rem] bg-chalk p-6" aria-labelledby="data-pemain">
        <h2 id="data-pemain" className="text-lg font-extrabold">Data terhubung</h2>
        <p className="mt-1 text-sm text-ink-soft">Tim, jadwal, kehadiran, dan iuran di akun ini berasal langsung dari catatan akademi.</p>
      </section>
    </div>
  );
}
