"use client";

import { Check, ChevronDown, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { MenuButton } from "./menu-button";

interface Props {
  venueName: string;
  venues: { id: string; name: string }[];
  activeVenueId: string;
  user: { name: string; email: string };
  roleLabel: string;
}

const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold hover:bg-mist";

export function AppHeader({ venueName, venues, activeVenueId, user, roleLabel }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchTo(id: string, close: () => void) {
    close();
    if (id === activeVenueId) return;
    setBusy(true);
    const r = await api("/venues/active", { body: { venueId: id } });
    setBusy(false);
    if (r.ok) {
      router.replace("/");
      router.refresh();
    }
  }

  async function logout() {
    setBusy(true);
    await api("/auth/logout", { method: "POST" });
    router.replace("/masuk");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-18 items-center gap-2 bg-mist/90 px-4 backdrop-blur sm:px-8">
      <MenuButton
        label={`Tempat aktif: ${venueName}. Ganti tempat`}
        align="left"
        buttonClassName="flex min-w-0 items-center gap-3 rounded-xl py-2 pr-3 pl-2 text-left transition hover:bg-chalk"
        button={
          <>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-pitch font-extrabold text-white shadow-[0_3px_0_var(--color-night)]">
              {venueName[0]?.toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-extrabold">{venueName}</span>
              <span className="block text-xs font-semibold text-ink-soft">{roleLabel}</span>
            </span>
            <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-soft" />
          </>
        }
      >
        {(close) => (
          <>
            <p className="px-3 pt-2 pb-1 text-xs font-bold text-ink-soft">Tempat Anda</p>
            {venues.map((a) => (
              <button
                key={a.id}
                role="menuitem"
                type="button"
                disabled={busy}
                onClick={() => switchTo(a.id, close)}
                className={item}
              >
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                {a.id === activeVenueId ? <Check aria-label="Sedang dibuka" className="size-4 text-turf" /> : null}
              </button>
            ))}
            <Link role="menuitem" href="/mulai?baru=1" className={`${item} mt-1 text-ink-soft hover:text-ink`}>
              <Plus aria-hidden className="size-4" /> Buat tempat lain
            </Link>
          </>
        )}
      </MenuButton>

      <div className="ml-auto">
        <MenuButton
          label={`Akun: ${user.name}`}
          align="right"
          buttonClassName="grid size-11 place-items-center rounded-full bg-ember font-extrabold text-white transition hover:scale-105"
          button={user.name[0]?.toUpperCase()}
        >
          {() => (
            <>
              <div className="px-3 py-2">
                <p className="truncate font-bold">{user.name}</p>
                <p className="truncate text-sm text-ink-soft">{user.email}</p>
              </div>
              <button role="menuitem" type="button" disabled={busy} onClick={logout} className={item}>
                <LogOut aria-hidden className="size-4" /> Keluar
              </button>
            </>
          )}
        </MenuButton>
      </div>
    </header>
  );
}
