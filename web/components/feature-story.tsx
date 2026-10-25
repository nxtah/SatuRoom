"use client";

import { CalendarDays, ClipboardCheck, ShieldCheck, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PhoneFrame } from "./phone-frame";

/* Layar contoh (data fiktif) untuk tiap fitur. */

function ScreenTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="px-4 pt-11">
      <p className="text-[11px] font-semibold text-ink-soft">{kicker}</p>
      <p className="font-display text-lg font-bold">{title}</p>
    </div>
  );
}

function PlayersScreen() {
  const rows = [
    ["Raka Pratama", "U-12", "11 th"],
    ["Bima Saputra", "U-12", "12 th"],
    ["Nadia Putri", "U-10", "9 th"],
    ["Fajar Hidayat", "U-14", "13 th"],
    ["Gilang Ramadhan", "U-10", "10 th"],
  ];
  return (
    <div className="pb-6">
      <ScreenTitle kicker="Akademi Garuda Muda" title="Pemain" />
      <div className="mx-4 mt-3 rounded-full bg-chalk px-4 py-2 text-xs text-ink-soft">
        Cari nama pemain
      </div>
      <div className="mx-4 mt-2 flex gap-1.5 text-[11px] font-bold">
        {["Semua", "U-10", "U-12", "U-14"].map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-3 py-1 ${i === 0 ? "bg-pitch text-white" : "bg-chalk text-ink-soft"}`}
          >
            {t}
          </span>
        ))}
      </div>
      <ul className="mx-4 mt-3 grid gap-1.5">
        {rows.map(([name, team, age]) => (
          <li key={name} className="flex items-center gap-2.5 rounded-2xl bg-chalk px-3 py-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-turf-soft text-xs font-bold text-pitch">
              {name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{name}</span>
              <span className="block text-[11px] text-ink-soft">{age}</span>
            </span>
            <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] font-bold">{team}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScheduleScreen() {
  const days = [
    ["Sen", "U-10", "15.30", "Lapangan A"],
    ["Sel", "U-12", "16.00", "Lapangan A"],
    ["Kam", "U-14", "16.00", "Lapangan B"],
    ["Sab", "Semua tim", "07.00", "Lapangan A"],
  ];
  return (
    <div className="pb-6">
      <ScreenTitle kicker="Minggu ini" title="Jadwal latihan" />
      <ul className="mx-4 mt-3 grid gap-2">
        {days.map(([d, team, time, place], i) => (
          <li key={d} className="flex items-center gap-3 rounded-2xl bg-chalk p-3">
            <span
              className={`grid size-11 place-items-center rounded-xl font-display text-sm font-bold ${
                i === 1 ? "bg-ember text-ink" : "bg-mist"
              }`}
            >
              {d}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">{team}</span>
              <span className="block text-[11px] text-ink-soft">
                {time}, {place}
              </span>
            </span>
            {i === 1 ? (
              <span className="rounded-full bg-ember-soft px-2 py-0.5 text-[11px] font-bold text-ember-deep">
                Hari ini
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mx-4 mt-3 rounded-2xl border-2 border-dashed border-line p-3 text-center text-xs font-bold text-ink-soft">
        Berulang tiap minggu
      </div>
    </div>
  );
}

function RecapScreen() {
  const rows: [string, number][] = [
    ["Raka Pratama", 8],
    ["Bima Saputra", 7],
    ["Dimas Arya", 5],
    ["Fajar Hidayat", 8],
  ];
  return (
    <div className="pb-6">
      <ScreenTitle kicker="U-12, 8 latihan terakhir" title="Rekap kehadiran" />
      <div className="mx-4 mt-3 rounded-2xl bg-ember-soft p-3 text-xs">
        <p className="font-bold text-ember-deep">Perlu perhatian</p>
        <p className="mt-0.5 text-ink">Dimas absen 3 latihan berturut-turut.</p>
      </div>
      <ul className="mx-4 mt-2 grid gap-1.5">
        {rows.map(([name, n]) => (
          <li key={name} className="rounded-2xl bg-chalk px-3 py-2.5">
            <div className="flex justify-between text-sm">
              <span className="font-bold">{name}</span>
              <span className="text-[11px] font-bold text-ink-soft tabular-nums">{n} dari 8</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-mist">
              <div
                className={`h-full rounded-full ${n < 6 ? "bg-ember" : "bg-turf"}`}
                style={{ width: `${(n / 8) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaffScreen() {
  const staff = [
    ["Pak Hendra", "Pemilik", "Semua data"],
    ["Bu Rina", "Admin", "Pemain, jadwal, staf"],
    ["Coach Andi", "Kepala pelatih", "Semua tim"],
    ["Coach Tomi", "Pelatih", "Hanya U-12"],
  ];
  return (
    <div className="pb-6">
      <ScreenTitle kicker="Akademi Garuda Muda" title="Staf" />
      <ul className="mx-4 mt-3 grid gap-1.5">
        {staff.map(([name, role, scope]) => (
          <li key={name} className="flex items-center gap-2.5 rounded-2xl bg-chalk px-3 py-2.5">
            <span className="grid size-8 place-items-center rounded-full bg-pitch text-xs font-bold text-white">
              {name.split(" ")[1]?.[0]}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold">{name}</span>
              <span className="block text-[11px] text-ink-soft">{scope}</span>
            </span>
            <span className="rounded-full bg-turf-soft px-2 py-0.5 text-[11px] font-bold text-pitch">
              {role}
            </span>
          </li>
        ))}
      </ul>
      <div className="mx-4 mt-3 rounded-full bg-ember py-2.5 text-center text-xs font-bold">
        Undang staf
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: Users,
    title: "Semua pemain di satu daftar",
    body: "Nama, umur, dan tim tiap pemain tersusun rapi. Cari dalam hitungan detik, tanpa buka spreadsheet.",
    screen: <PlayersScreen />,
  },
  {
    icon: CalendarDays,
    title: "Jadwal latihan yang tidak tenggelam",
    body: "Buat jadwal mingguan per tim sekali, berulang otomatis. Pelatih tahu harus di lapangan mana dan jam berapa.",
    screen: <ScheduleScreen />,
  },
  {
    icon: ClipboardCheck,
    title: "Tahu siapa yang mulai jarang datang",
    body: "Absensi langsung jadi rekap per pemain. Pemain yang absen beberapa kali berturut-turut ditandai, sebelum dia berhenti.",
    screen: <RecapScreen />,
  },
  {
    icon: ShieldCheck,
    title: "Tiap staf lihat yang perlu saja",
    body: "Pelatih hanya melihat timnya. Kontak orang tua hanya untuk pemilik dan admin. Akses bisa dicabut kapan saja.",
    screen: <StaffScreen />,
  },
];

export function FeatureStory() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    // Langkah yang melewati tengah layar menjadi aktif; ponsel di kanan berganti layar.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:gap-20">
      <ol className="grid gap-10 lg:gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const on = active === i;
          return (
            <li
              key={s.title}
              data-index={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="lg:flex lg:min-h-[70vh] lg:items-center"
            >
              <div
                className={`max-w-md transition-opacity duration-500 ${on ? "lg:opacity-100" : "lg:opacity-35"}`}
              >
                <span
                  className={`grid size-12 place-items-center rounded-2xl transition-colors duration-500 ${
                    on ? "bg-ember text-ink" : "bg-turf-soft text-pitch"
                  }`}
                >
                  <Icon aria-hidden className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
                  {s.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-ink-soft">{s.body}</p>
                {/* Di HP, layar contoh tampil langsung di bawah teks. */}
                <div className="mt-8 lg:hidden">
                  <PhoneFrame label={`Contoh layar: ${s.title}`} className="max-w-[280px]">
                    {s.screen}
                  </PhoneFrame>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="hidden lg:block">
        <div className="sticky top-[12vh]">
          <PhoneFrame label={`Contoh layar: ${STEPS[active]!.title}`}>
            <div className="relative h-[540px]">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  aria-hidden={active !== i}
                  className={`absolute inset-0 transition-all duration-500 ${
                    active === i ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
                  }`}
                >
                  {s.screen}
                </div>
              ))}
            </div>
          </PhoneFrame>
          <div className="mt-5 flex justify-center gap-2" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-2 rounded-full transition-all duration-500 ${active === i ? "w-8 bg-ember" : "w-2 bg-line"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
