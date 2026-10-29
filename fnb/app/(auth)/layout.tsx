import { Brand } from "@/components/brand";
import { Maskot } from "@/components/maskot";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-plate lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative hidden overflow-hidden bg-kitchen p-12 text-white lg:flex lg:flex-col">
        <Brand tone="white" />
        <span aria-hidden className="pointer-events-none absolute -right-24 bottom-12 size-[30rem] rounded-full bg-white/[0.05]" />
        <div className="relative mt-auto">
          <div className="mx-auto w-72 xl:w-80"><Maskot variant="chef" priority className="maskot-float drop-shadow-maskot" /></div>
          <p className="mt-8 max-w-lg text-5xl leading-tight font-extrabold tracking-tight text-balance">Dari pesanan masuk sampai dapur siap, semua tetap rapi.</p>
          <p className="mt-5 max-w-md text-lg text-white/65">Satu alur untuk kasir, pelayan, dapur, stok, dan pemilik.</p>
        </div>
      </aside>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center p-6">
        <div className="mb-8 lg:hidden"><Brand /></div>
        {children}
      </main>
    </div>
  );
}
