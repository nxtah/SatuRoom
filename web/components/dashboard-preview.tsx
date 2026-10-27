import { AreaTrend, BarList, Ring, Sparkline } from "@/components/charts";
import { LogoMark } from "@/components/maskot";

/* Contoh tampilan: angkanya fiktif dan diberi label begitu di halaman. */
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const compact = (n: number) => (n >= 1_000_000 ? `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")} jt` : `Rp${Math.round(n / 1000)} rb`);

const ATTENDANCE = [64, 71, 69, 78, 84, 88];
const WEEKS = ["3 Mar", "10 Mar", "17 Mar", "24 Mar", "31 Mar", "7 Apr"];
const SALES = [980_000, 1_240_000, 1_100_000, 1_530_000, 1_870_000, 2_240_000, 1_960_000];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MENU = [
  { label: "Nasi goreng spesial", value: 34, hint: rp(34 * 28_000) },
  { label: "Es kopi susu", value: 29, hint: rp(29 * 22_000) },
  { label: "Mie ayam", value: 21, hint: rp(21 * 20_000) },
  { label: "Teh tarik", value: 14, hint: rp(14 * 16_000) },
];

function Bar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-display text-xl font-extrabold">{title}</p>
      <LogoMark className="h-6 opacity-90" />
      <span className="sr-only">Contoh tampilan</span>
      {children}
    </div>
  );
}

export function BolaPreview() {
  return (
    <div className="rounded-[2rem] bg-mist p-4 text-ink sm:p-6">
      <Bar title="Beranda akademi" >{null}</Bar>
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

export function RasaPreview() {
  return (
    <div className="rounded-[2rem] bg-plate p-4 text-kitchen sm:p-6">
      <Bar title="Ringkasan outlet">{null}</Bar>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2 flex items-end justify-between gap-3 rounded-[1.5rem] bg-saffron p-5">
          <div>
            <p className="text-sm font-bold text-kitchen/75">Penjualan hari ini</p>
            <p className="mt-6 text-4xl leading-none font-extrabold tracking-tight sm:text-5xl">{rp(SALES[6])}</p>
          </div>
          <span className="hidden w-28 text-kitchen sm:block"><Sparkline values={SALES} /></span>
        </div>
        <figure className="col-span-2 rounded-[1.5rem] bg-white p-5">
          <figcaption className="font-extrabold">Penjualan 7 hari</figcaption>
          <AreaTrend
            className="mt-8 text-tomato"
            caption="Contoh penjualan 7 hari"
            max={2_500_000}
            ticks={[0, 1_250_000, 2_500_000]}
            format={compact}
            points={DAYS.map((label, i) => ({ label, value: SALES[i], note: rp(SALES[i]) }))}
          />
        </figure>
        <figure className="col-span-2 rounded-[1.5rem] bg-white p-5">
          <figcaption className="font-extrabold">Menu terlaris</figcaption>
          <BarList className="mt-5" barClassName="bg-saffron" rows={MENU} format={(n) => `${n} porsi`} />
        </figure>
      </div>
    </div>
  );
}
