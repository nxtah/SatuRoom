"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Item = { slug: string; title: string; summary: string; text: string };

/** Cari di seluruh panduan (judul, ringkasan, dan isi). */
export function DocsSearch({ docs }: { docs: Item[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const hits = term.length < 2 ? [] : docs.filter((d) => `${d.title} ${d.summary} ${d.text}`.toLowerCase().includes(term));
  return (
    <div className="mt-6">
      <label className="flex h-14 items-center gap-3 rounded-full border-2 border-line bg-chalk px-5 focus-within:border-pitch">
        <Search aria-hidden className="size-5 text-ink-soft" />
        <span className="sr-only">Cari panduan</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari, misalnya: absen QR, iuran, undangan" className="h-full min-w-0 flex-1 bg-transparent outline-none" />
      </label>
      {term.length >= 2 ? (
        <div className="mt-3 grid gap-2" role="status">
          {hits.length ? (
            hits.map((d) => (
              <Link key={d.slug} href={`/docs/${d.slug}`} className="rounded-[1.25rem] bg-chalk p-4 transition hover:ring-2 hover:ring-pitch">
                <b>{d.title}</b>
                <span className="block text-sm text-ink-soft">{d.summary}</span>
              </Link>
            ))
          ) : (
            <p className="rounded-[1.25rem] bg-chalk p-4 text-ink-soft">Tidak ada yang cocok. Coba kata lain, atau buka Pemecahan masalah.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
