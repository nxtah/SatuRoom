import Link from "next/link";
import { DOC_GROUPS, DOCS } from "@/lib/docs-content";
import { DocsSearch } from "./docs-search";

export default function DocsHome() {
  return <>
    <p className="font-bold text-tomato">Panduan</p>
    <h1 className="mt-1 text-3xl font-extrabold sm:text-5xl">Cara memakai Rasa</h1>
    <p className="mt-3 max-w-2xl text-lg text-stone-700">Dari daftar pertama sampai laporan harian. Ditulis dengan bahasa sehari-hari, lengkap dengan solusi kalau ada pesan galat.</p>
    <DocsSearch docs={DOCS.map((d) => ({ slug: d.slug, title: d.title, summary: d.summary, text: JSON.stringify(d.blocks) }))} />
    {DOC_GROUPS.map((g) => <section key={g} className="mt-8" aria-labelledby={`g-${g}`}>
      <h2 id={`g-${g}`} className="text-xl font-extrabold">{g}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {DOCS.filter((d) => d.group === g).map((d) => <Link key={d.slug} href={`/docs/${d.slug}`} className="rounded-[1.5rem] bg-white p-5 transition hover:ring-2 hover:ring-saffron"><b className="text-lg">{d.title}</b><span className="mt-1 block text-sm text-stone-600">{d.summary}</span></Link>)}
      </div>
    </section>)}
  </>;
}
