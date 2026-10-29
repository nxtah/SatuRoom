import { Brand } from "@/components/brand";
import { Maskot } from "@/components/maskot";
import { Tile } from "@/components/tiles";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-chalk lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      {/* Panel kiri hanya di layar lebar: meja felt dengan ubin berjatuhan. */}
      <aside className="felt relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <Brand tone="white" />
        <div className="relative z-10 mt-auto max-w-md">
          <p className="text-6xl leading-[1.05] font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Meja terisi, kasir tenang.
          </p>
          <p className="mt-5 text-lg text-white/70">Meja, booking, member, kantin, dan liga mahjong dalam satu tempat.</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute top-16 right-12 flex gap-3">
          {(["中", "發", "東"] as const).map((t, i) => (
            <Tile key={t} face={{ kind: "glyph", text: t, tone: i === 1 ? "green" : "red" }} className="deal w-16 drop-shadow-xl" />
          ))}
        </div>
        <div className="pointer-events-none absolute right-8 bottom-6 w-44 opacity-95">
          <Maskot />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="felt relative -mx-5 -mt-6 overflow-hidden px-5 py-4 sm:-mx-10 sm:px-10 lg:hidden">
          <Brand tone="white" />
          <div aria-hidden className="absolute -top-3 right-6 flex gap-1.5">
            <Tile face={{ kind: "glyph", text: "中" }} className="w-9 rotate-6" />
            <Tile face={{ kind: "glyph", text: "發", tone: "green" }} className="w-9 -rotate-3" />
          </div>
        </div>
        <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">{children}</main>
      </div>
    </div>
  );
}
