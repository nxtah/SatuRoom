import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { DocsNav } from "./docs-nav";

export const metadata: Metadata = { title: { default: "Panduan Rasa", template: "%s | Panduan Rasa" }, description: "Cara memakai SatuRoom Rasa, dari mulai sampai pemecahan masalah.", robots: { index: true, follow: true } };

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-plate">
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-plate/90 px-4 backdrop-blur sm:px-8">
      <Brand href="/docs" />
      <span className="hidden text-sm font-bold text-stone-600 sm:inline">Panduan</span>
      <Link href="/" className="ml-auto inline-flex h-10 items-center rounded-full bg-kitchen px-5 text-sm font-extrabold text-white">Buka Rasa</Link>
    </header>
    <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 sm:px-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <DocsNav />
      <main id="isi" className="min-w-0">{children}</main>
    </div>
  </div>;
}
