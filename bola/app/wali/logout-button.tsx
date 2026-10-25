"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await api("/auth/logout", { method: "POST" });
        router.replace("/masuk");
        router.refresh();
      }}
      className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-ink-soft transition hover:bg-chalk hover:text-ink"
    >
      <LogOut aria-hidden className="size-4" /> Keluar
    </button>
  );
}
