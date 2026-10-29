import { Brand } from "@/components/brand";
import { LogoMark } from "@/components/maskot";
import { LogoutButton } from "./logout-button";
import { PlayerBottomNav, PlayerSideNav } from "./player-nav";

export function PlayerShell({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div style={{ "--color-ember": accent } as React.CSSProperties} className="min-h-dvh md:grid md:grid-cols-[92px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
      <a href="#isi" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-pitch focus:px-4 focus:py-2 focus:text-white">
        Lewati ke isi
      </a>
      <aside className="hidden md:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-8 overflow-y-auto p-3 lg:p-5">
          <div className="hidden px-2 pt-1 lg:block"><Brand href="/saya" /></div>
          <div className="mx-auto pt-3 lg:hidden"><LogoMark className="h-10" /></div>
          <PlayerSideNav />
        </div>
      </aside>
      <div className="min-w-0 pb-24 md:pb-0">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between bg-mist/90 px-4 backdrop-blur sm:px-8">
          <div className="md:hidden"><Brand href="/saya" /></div>
          <p className="hidden text-sm font-bold text-ink-soft md:block">Akun pemain</p>
          <LogoutButton />
        </header>
        <main id="isi" className="mx-auto w-full max-w-6xl px-4 pt-3 pb-10 sm:px-8">{children}</main>
      </div>
      <PlayerBottomNav />
    </div>
  );
}
