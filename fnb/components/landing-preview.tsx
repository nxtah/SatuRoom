import { AreaTrend, BarList, Sparkline } from "@/components/charts";
import { LogoMark } from "@/components/maskot";

/* Contoh tampilan: angkanya fiktif dan diberi label begitu di halaman. */
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const compact = (n: number) => (n >= 1_000_000 ? `Rp${(n / 1_000_000).toFixed(1).replace(".", ",")} jt` : `Rp${Math.round(n / 1000)} rb`);
const SALES = [980_000, 1_240_000, 1_100_000, 1_530_000, 1_870_000, 2_240_000, 1_960_000];
const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MENU = [
  { label: "Nasi goreng spesial", value: 34, hint: rp(34 * 28_000) },
  { label: "Es kopi susu", value: 29, hint: rp(29 * 22_000) },
  { label: "Mie ayam", value: 21, hint: rp(21 * 20_000) },
  { label: "Teh tarik", value: 14, hint: rp(14 * 16_000) },
];

export function RasaPreview() {
  return (
    <div className="rounded-[2rem] bg-plate p-4 text-kitchen sm:p-6">
      <div className="flex items-center justify-between gap-3"><p className="text-xl font-extrabold">Ringkasan outlet</p><LogoMark className="h-6" /></div>
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
          <AreaTrend className="mt-8 text-tomato" caption="Contoh penjualan 7 hari" max={2_500_000} ticks={[0, 1_250_000, 2_500_000]} format={compact} points={DAYS.map((label, i) => ({ label, value: SALES[i], note: rp(SALES[i]) }))} />
        </figure>
        <figure className="col-span-2 rounded-[1.5rem] bg-white p-5">
          <figcaption className="font-extrabold">Menu terlaris</figcaption>
          <BarList className="mt-5" barClassName="bg-saffron" rows={MENU} format={(n) => `${n} porsi`} />
        </figure>
      </div>
    </div>
  );
}

/* Layar dapur contoh: tiga kolom, tiket fiktif. */
const BOARD = [
  { name: "Baru", tone: "bg-saffron text-kitchen", tickets: [["Meja 4", "2 Nasi goreng, 1 Es teh"], ["Bungkus", "3 Mie ayam"]] },
  { name: "Dimasak", tone: "bg-tomato text-white", tickets: [["Meja 7", "1 Mie kuah, 2 Kopi susu"]] },
  { name: "Siap", tone: "bg-basil text-white", tickets: [["Ambil", "3 Roti bakar"]] },
] as const;

export function KitchenBoard() {
  return (
    <div className="rounded-[2rem] bg-night p-4 text-white ring-1 ring-white/10 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl font-bold">Tiket masuk</p>
        <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/70">Contoh</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {BOARD.map((col) => (
          <div key={col.name} className="rounded-[1.5rem] bg-kitchen-2 p-3">
            <p className={`inline-block rounded-full px-3 py-1 text-sm font-extrabold ${col.tone}`}>{col.name}</p>
            <ul className="mt-3 grid gap-2">
              {col.tickets.map(([where, what]) => (
                <li key={where + what} className="rounded-2xl bg-white p-3 text-kitchen">
                  <p className="font-extrabold">{where}</p>
                  <p className="text-sm text-kitchen/75">{what}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Stok contoh: bahan hampir habis ditandai. */
const STOCK = [
  ["Beras", 82, "bg-basil", "Aman"],
  ["Telur", 38, "bg-saffron", "Menipis"],
  ["Cabai", 9, "bg-tomato", "Hampir habis"],
] as const;

export function StockBoard() {
  return (
    <div className="rounded-[2rem] bg-white p-5 text-kitchen sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-2xl font-bold">Stok bahan</p>
        <span className="rounded-full bg-cream px-3 py-1 text-sm font-semibold">Contoh</span>
      </div>
      <ul className="mt-5 grid gap-4">
        {STOCK.map(([name, pct, bar, state]) => (
          <li key={name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-extrabold">{name}</p>
              <p className={`text-sm font-bold ${pct < 15 ? "text-chili" : "text-kitchen/70"}`}>{state}</p>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-cream">
              <div className={`grow-bar h-full origin-left rounded-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
