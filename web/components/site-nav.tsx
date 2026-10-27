import { BOLA_URL, RASA_URL } from "@/lib/site";
import { LogoMark } from "./maskot";

const LINKS = [
  ["Bola", "#bola"],
  ["Rasa", "#rasa"],
  ["Cara mulai", "#mulai"],
  ["Tanya jawab", "#tanya"],
];

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border border-line bg-chalk-glass px-2 pl-3 shadow-nav backdrop-blur-md sm:h-16 sm:px-3 sm:pl-4"
      >
        <a href="#" className="flex items-center gap-2 rounded-full">
          <LogoMark className="h-8 sm:h-9" />
          <span className="font-display text-lg font-extrabold tracking-tight sm:text-xl">SatuRoom</span>
        </a>
        <ul className="mx-auto hidden items-center gap-1 md:flex">
          {LINKS.map(([label, href]) => (
            <li key={href}>
              <a
                href={href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-mist hover:text-ink"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {/* Menu masuk tanpa JavaScript: pilih aplikasi yang dipakai. */}
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center rounded-full px-3 py-2 text-sm font-bold transition hover:bg-mist sm:px-4 [&::-webkit-details-marker]:hidden">
              Masuk
            </summary>
            <div className="absolute right-0 mt-2 grid w-52 gap-1 rounded-[1.25rem] border border-line bg-chalk p-2 shadow-lift">
              <a href={`${BOLA_URL}/masuk`} className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-mist">
                SatuRoom Bola
                <span className="block text-xs font-semibold text-ink-soft">Akademi sepak bola</span>
              </a>
              <a href={`${RASA_URL}/masuk`} className="rounded-xl px-4 py-3 text-sm font-bold hover:bg-mist">
                SatuRoom Rasa
                <span className="block text-xs font-semibold text-ink-soft">Kafe dan warung</span>
              </a>
            </div>
          </details>
          <a
            href="#aplikasi"
            className="rounded-full bg-pitch px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pitch-2 active:scale-[0.97] sm:px-5"
          >
            Coba gratis
          </a>
        </div>
      </nav>
    </header>
  );
}
