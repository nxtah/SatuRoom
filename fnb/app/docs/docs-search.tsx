"use client";
import Link from "next/link";
import { useState } from "react";

type Item = { slug: string; title: string; summary: string; text: string };

/** Cari di seluruh panduan (judul, ringkasan, dan isi). */
export function DocsSearch({ docs }: { docs: Item[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const hits = term.length < 2 ? [] : docs.filter((d) => `${d.title} ${d.summary} ${d.text}`.toLowerCase().includes(term));
  return <div className="mt-6">
    <label className="flex h-13 items-center rounded-full bg-white px-5"><span className="sr-only">Cari panduan</span>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari, misalnya: shift, refund, undangan" className="h-full min-w-0 flex-1 bg-transparent outline-none" /></label>
    {term.length >= 2 ? <div className="mt-3 grid gap-2" role="status">
      {hits.length ? hits.map((d) => <Link key={d.slug} href={`/docs/${d.slug}`} className="rounded-2xl bg-white p-4"><b>{d.title}</b><span className="block text-sm text-stone-600">{d.summary}</span></Link>) : <p className="rounded-2xl bg-white p-4 text-stone-600">Tidak ada yang cocok. Coba kata lain, atau lihat Pemecahan masalah.</p>}
    </div> : null}
  </div>;
}
