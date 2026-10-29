import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Judul halaman dengan tombol kembali opsional dan aksi di kanan. */
export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  action?: ReactNode;
}) {
  return (
    <div className="rise mb-5">
      {back ? (
        <Link
          href={back.href}
          className="-ml-2 mb-2 inline-flex h-9 items-center gap-1 rounded-xl px-2 text-sm font-bold text-ink-soft hover:bg-chalk hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-4" /> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-ink-soft">{subtitle}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}
