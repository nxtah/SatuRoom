"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MenuButton } from "./menu-button";

type Item = { id: string; title: string; body: string | null; href: string | null; read: boolean; createdAt: string };

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/** Lonceng notifikasi di header. `endpoint`: /notifications (staf) atau /me/player/notifications (orang tua). */
export function NotificationBell({ endpoint, items, unread }: { endpoint: string; items: Item[]; unread: number }) {
  const router = useRouter();
  async function read(id?: string) {
    await api(endpoint, { body: id ? { id } : {} });
    router.refresh();
  }
  return (
    <MenuButton
      label={unread ? `Notifikasi, ${unread} belum dibaca` : "Notifikasi"}
      align="right"
      buttonClassName="relative grid size-11 place-items-center rounded-full bg-chalk transition hover:bg-white"
      button={
        <>
          <Bell aria-hidden className="size-5" />
          {unread ? (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-flame px-1 text-[11px] font-extrabold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </>
      }
    >
      {(close) => (
        <div className="w-[min(22rem,calc(100vw-2rem))]">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-extrabold">Notifikasi</p>
            {unread ? (
              <button type="button" onClick={() => read()} className="text-sm font-bold text-pitch hover:underline">
                Tandai semua dibaca
              </button>
            ) : null}
          </div>
          {items.length === 0 ? <p className="px-3 pb-3 text-sm text-ink-soft">Belum ada notifikasi.</p> : null}
          <ul className="max-h-[60vh] overflow-y-auto">
            {items.map((n) => {
              const inner = (
                <>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-flame"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block break-words ${n.read ? "font-semibold" : "font-extrabold"}`}>{n.title}</span>
                    {n.body ? <span className="block text-sm break-words text-ink-soft">{n.body}</span> : null}
                    <span className="block text-xs text-ink-soft">{ago(n.createdAt)}</span>
                  </span>
                </>
              );
              const cls = "flex w-full gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-mist";
              return (
                <li key={n.id}>
                  {n.href ? (
                    <Link role="menuitem" href={n.href} className={cls} onClick={() => { close(); if (!n.read) void read(n.id); }}>
                      {inner}
                    </Link>
                  ) : (
                    <button role="menuitem" type="button" className={cls} onClick={() => !n.read && read(n.id)}>
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </MenuButton>
  );
}
