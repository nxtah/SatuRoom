import { APP_URL } from "@/lib/site";
import { RuruMark } from "./ruru";

const LINKS = [
  ["Fitur", "#fitur"],
  ["Cara mulai", "#mulai"],
  ["Tanya jawab", "#tanya"],
];

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <nav
        aria-label="Navigasi utama"
        className="nav-scroll mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-full border border-transparent px-2 pl-3 backdrop-blur-md sm:h-16 sm:px-3 sm:pl-4"
      >
        <a href="#" className="flex items-center gap-2 rounded-full">
          <RuruMark className="size-8 sm:size-9" />
          <span className="font-display text-lg font-extrabold tracking-tight sm:text-xl">SatuRoom</span>
          <span className="hidden rounded-full bg-turf-soft px-2 py-0.5 text-xs font-bold text-pitch sm:inline">
            Bola
          </span>
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
          <a
            href={`${APP_URL}/masuk`}
            className="rounded-full px-3 py-2 text-sm font-bold transition hover:bg-mist sm:px-4"
          >
            Masuk
          </a>
          <a
            href={`${APP_URL}/daftar`}
            className="rounded-full bg-pitch px-4 py-2.5 text-sm font-bold text-white transition hover:bg-pitch-2 active:scale-[0.97] sm:px-5"
          >
            Coba gratis
          </a>
        </div>
      </nav>
    </header>
  );
}
