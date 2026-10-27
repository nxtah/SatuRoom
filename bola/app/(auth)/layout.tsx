import { Brand } from "@/components/brand";
import { Maskot } from "@/components/maskot";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-chalk lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      {/* Panel kiri hanya di layar lebar. */}
      <aside className="relative hidden overflow-hidden bg-pitch p-12 text-white lg:flex lg:flex-col">
        <Brand tone="white" />
        <div className="relative z-10 mt-auto max-w-md">
          <p className="font-display text-7xl leading-[0.9] font-extrabold uppercase italic">
            Pelatih fokus di lapangan. Urusan data biar rapi di sini.
          </p>
          <p className="mt-5 text-lg text-white/70">Pemain, jadwal latihan, dan absensi akademi dalam satu tempat.</p>
        </div>
        <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -top-24 -right-24 w-[460px] text-white/[0.06]">
          <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="10" />
          <path d="M0 200 H400" stroke="currentColor" strokeWidth="10" />
          <circle cx="200" cy="200" r="12" fill="currentColor" />
        </svg>
        <div className="pointer-events-none absolute right-10 bottom-10 w-52">
          <Maskot />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="relative -mx-5 -mt-6 overflow-hidden bg-pitch px-5 py-4 sm:-mx-10 sm:px-10 lg:hidden">
          <Brand tone="white" />
          <span aria-hidden className="absolute -top-4 right-10 h-24 w-5 -rotate-[24deg] bg-ember" />
          <span aria-hidden className="absolute -top-4 right-4 h-24 w-2 -rotate-[24deg] bg-ember/50" />
        </div>
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">{children}</main>
      </div>
    </div>
  );
}
