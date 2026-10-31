import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCS, docBySlug } from "@/lib/docs-content";
import { Blocks } from "../blocks";

export const dynamicParams = false;
export const generateStaticParams = () => DOCS.map((d) => ({ slug: d.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = docBySlug((await params).slug);
  return d ? { title: d.title, description: d.summary } : {};
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = docBySlug((await params).slug);
  if (!d) notFound();
  const i = DOCS.indexOf(d);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];
  return (
    <article>
      <p className="font-bold text-turf">{d.group}</p>
      <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">{d.title}</h1>
      <p className="mt-2 mb-6 max-w-2xl text-lg text-ink-soft">{d.summary}</p>
      <Blocks blocks={d.blocks} />
      <nav aria-label="Halaman lain" className="mt-10 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={`/docs/${prev.slug}`} className="rounded-[1.25rem] bg-chalk p-4 transition hover:ring-2 hover:ring-pitch">
            <span className="text-xs font-bold text-ink-soft">Sebelumnya</span>
            <b className="block">{prev.title}</b>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/docs/${next.slug}`} className="rounded-[1.25rem] bg-chalk p-4 transition hover:ring-2 hover:ring-pitch sm:text-right">
            <span className="text-xs font-bold text-ink-soft">Berikutnya</span>
            <b className="block">{next.title}</b>
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
