"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_GROUPS, DOCS } from "@/lib/docs-content";

/** Daftar isi: kolom di layar lebar, deretan tombol yang bisa digulir di HP. */
export function DocsNav() {
  const path = usePathname();
  const on = (slug: string) => path === `/docs/${slug}`;
  return <>
    <nav aria-label="Daftar panduan" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
      {DOCS.map((d) => <Link key={d.slug} href={`/docs/${d.slug}`} aria-current={on(d.slug) ? "page" : undefined} className={`h-10 shrink-0 content-center rounded-full px-4 text-sm font-bold ${on(d.slug) ? "bg-kitchen text-white" : "bg-white"}`}>{d.title}</Link>)}
    </nav>
    <nav aria-label="Daftar panduan" className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] content-start gap-4 self-start overflow-y-auto pr-2 lg:grid">
      <Link href="/docs" className={`rounded-xl px-3 py-2 font-extrabold ${path === "/docs" ? "bg-saffron text-kitchen" : ""}`}>Semua panduan</Link>
      {DOC_GROUPS.map((g) => <div key={g}>
        <p className="px-3 pb-1 text-xs font-extrabold tracking-wide text-stone-500 uppercase">{g}</p>
        {DOCS.filter((d) => d.group === g).map((d) => <Link key={d.slug} href={`/docs/${d.slug}`} aria-current={on(d.slug) ? "page" : undefined} className={`block rounded-xl px-3 py-2 text-[15px] font-bold ${on(d.slug) ? "bg-saffron text-kitchen" : "text-stone-700 hover:bg-white"}`}>{d.title}</Link>)}
      </div>)}
    </nav>
  </>;
}
