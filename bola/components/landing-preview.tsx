import { AreaTrend, Ring, Sparkline } from "@/components/charts";
import { LogoMark } from "@/components/maskot";

/* Contoh tampilan: angkanya fiktif dan diberi label begitu di halaman. */
const ATTENDANCE = [64, 71, 69, 78, 84, 88];
const WEEKS = ["3 Mar", "10 Mar", "17 Mar", "24 Mar", "31 Mar", "7 Apr"];

export function BolaPreview() {
  return (
    <div className="rounded-[2rem] bg-mist p-4 text-ink sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xl font-extrabold">Beranda akademi</p>
        <LogoMark className="h-6" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2 flex items-end justify-between gap-3 rounded-[1.5rem] bg-ember p-5">
          <div>
            <p className="text-sm font-bold text-ink/75">Kehadiran 30 hari</p>
            <p className="mt-6 text-5xl leading-none font-extrabold tracking-tight">88%</p>
          </div>
          <span className="w-32 text-ink"><Sparkline values={ATTENDANCE} /></span>
        </div>
        <div className="rounded-[1.5rem] bg-chalk p-5">
          <p className="text-sm font-bold text-ink-soft">Pemain aktif</p>
          <p className="mt-6 text-4xl leading-none font-extrabold">42</p>
        </div>
        <div className="flex items-end justify-between gap-2 rounded-[1.5rem] bg-chalk p-5">
          <div>
            <p className="text-sm font-bold text-ink-soft">Iuran terkumpul</p>
            <p className="mt-6 text-4xl leading-none font-extrabold">78%</p>
          </div>
          <Ring value={78} size={52} stroke={7} className="text-turf"><span className="sr-only">78%</span></Ring>
        </div>
        <figure className="col-span-2 rounded-[1.5rem] bg-chalk p-5">
          <figcaption className="font-extrabold">Kehadiran per minggu</figcaption>
          <AreaTrend
            className="mt-8 text-turf"
            caption="Contoh kehadiran per minggu"
            max={100}
            ticks={[0, 50, 100]}
            format={(n) => `${n}%`}
            points={WEEKS.map((label, i) => ({ label, value: ATTENDANCE[i] }))}
          />
        </figure>
      </div>
    </div>
  );
}
