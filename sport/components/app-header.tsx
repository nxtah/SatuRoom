"use client";

import { Check, ChevronDown, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { AcademyMark } from "./academy-mark";
import { MenuButton } from "./menu-button";

interface Props {
  academyName: string;
  logoUrl: string | null;
  academies: { id: string; name: string }[];
  activeAcademyId: string;
  user: { name: string; email: string };
  roleLabel: string;
}

const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold hover:bg-mist";

export function AppHeader({ academyName, logoUrl, academies, activeAcademyId, user, roleLabel }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchTo(id: string, close: () => void) {
    close();
    if (id === activeAcademyId) return;
    setBusy(true);
    const r = await api("/academies/active", { body: { academyId: id } });
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
        label={`Akademi aktif: ${academyName}. Ganti akademi`}
        align="left"
        buttonClassName="flex max-w-full min-w-0 items-center gap-3 rounded-2xl py-2 pr-3 pl-2 text-left transition hover:bg-chalk"
        button={
          <>
            <AcademyMark name={academyName} logoUrl={logoUrl} />
            <span className="min-w-0">
              <span className="block truncate font-extrabold">{academyName}</span>
              <span className="block text-xs font-semibold text-ink-soft">{roleLabel}</span>
            </span>
            <ChevronDown aria-hidden className="size-4 shrink-0 text-ink-soft" />
          </>
        }
      >
        {(close) => (
          <>
            <p className="px-3 pt-2 pb-1 text-xs font-bold text-ink-soft">Akademi Anda</p>
            {academies.map((a) => (
              <button
                key={a.id}
                role="menuitem"
                type="button"
                disabled={busy}
                onClick={() => switchTo(a.id, close)}
                className={item}
              >
                <span className="min-w-0 flex-1 truncate">{a.name}</span>
                {a.id === activeAcademyId ? <Check aria-label="Sedang dibuka" className="size-4 text-turf" /> : null}
              </button>
            ))}
            <Link role="menuitem" href="/mulai?baru=1" className={`${item} mt-1 text-ink-soft hover:text-ink`}>
              <Plus aria-hidden className="size-4" /> Buat akademi lain
            </Link>
          </>
        )}
      </MenuButton>

      <div className="ml-auto shrink-0">
        <MenuButton
          label={`Akun: ${user.name}`}
          align="right"
          buttonClassName="grid size-11 place-items-center rounded-full bg-ember font-extrabold text-ink transition hover:scale-105"
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
