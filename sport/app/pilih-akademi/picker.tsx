"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { api } from "@/lib/api";

export function AcademyPicker({ academies }: { academies: { id: string; name: string; city: string | null }[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string>();
  const [error, setError] = useState<string>();

  async function open(id: string) {
    setPending(id);
    setError(undefined);
    const r = await api("/academies/active", { body: { academyId: id } });
    if (!r.ok) {
      setPending(undefined);
      setError(r.error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {academies.map((a) => (
        <button
          key={a.id}
          type="button"
          disabled={pending !== undefined}
          onClick={() => open(a.id)}
          className="group flex items-center gap-4 rounded-[1.5rem] border border-line bg-chalk p-4 text-left transition hover:-translate-y-0.5 hover:border-pitch/30 hover:shadow-[0_18px_40px_-28px_rgb(11_26_58/0.5)] disabled:opacity-60"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-turf-soft text-lg font-extrabold text-pitch">
            {a.name[0]?.toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{a.name}</span>
            {a.city ? <span className="block text-sm text-ink-soft">{a.city}</span> : null}
          </span>
          <span className="text-sm font-bold text-ink-soft">{pending === a.id ? "Membuka…" : null}</span>
          <ChevronRight aria-hidden className="size-5 text-ink-soft transition group-hover:translate-x-0.5" />
        </button>
      ))}
      <Link
        href="/mulai?baru=1"
        className="flex items-center gap-4 rounded-[1.5rem] border-2 border-dashed border-line p-4 font-bold text-ink-soft transition hover:border-pitch/30 hover:text-ink"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-mist">
          <Plus aria-hidden className="size-5" />
        </span>
        Buat akademi lain
      </Link>
    </div>
  );
}
