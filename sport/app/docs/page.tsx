import Link from "next/link";
import { Maskot } from "@/components/maskot";
import { DOC_GROUPS, DOCS } from "@/lib/docs-content";
import { DocsSearch } from "./docs-search";

export default function DocsHome() {
  return (
    <>
      <section className="relative overflow-hidden rounded-[2rem] bg-pitch px-5 py-8 text-white sm:px-10 sm:py-10">
        <div aria-hidden className="pointer-events-none absolute right-2 bottom-0 hidden w-36 sm:block lg:w-44">
          <Maskot />
        </div>
        <p className="font-bold text-ember">Panduan</p>
        <h1 className="mt-1 max-w-xl text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl">Cara memakai SatuRoom Sport</h1>
        <p className="mt-3 max-w-xl text-white/75 sm:text-lg">
          Dari membuat akademi sampai menagih iuran. Bahasa sehari-hari, langkah demi langkah, lengkap dengan solusi kalau ada masalah.
        </p>
      </section>
      <DocsSearch docs={DOCS.map((d) => ({ slug: d.slug, title: d.title, summary: d.summary, text: JSON.stringify(d.blocks) }))} />
      {DOC_GROUPS.map((g) => (
        <section key={g} className="mt-8" aria-labelledby={`g-${g}`}>
          <h2 id={`g-${g}`} className="text-xl font-extrabold">{g}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {DOCS.filter((d) => d.group === g).map((d) => (
              <Link key={d.slug} href={`/docs/${d.slug}`} className="rounded-[1.5rem] bg-chalk p-5 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-pitch">
                <b className="text-lg">{d.title}</b>
                <span className="mt-1 block text-sm text-ink-soft">{d.summary}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
