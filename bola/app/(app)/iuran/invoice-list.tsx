"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { dayLabel } from "@/lib/dates";
import { monthLabel, rupiah, whatsappLink } from "@/lib/money";
import { PAYMENT_METHODS } from "@/lib/schemas";
import type { InvoiceRow } from "@/server/fees";

const STATUS = {
  unpaid: { label: "Belum bayar", tone: "bg-ember-soft text-ember-deep" },
  paid: { label: "Lunas", tone: "bg-turf-soft text-pitch" },
  waived: { label: "Dibebaskan", tone: "bg-mist text-ink-soft" },
} as const;

/** Daftar tagihan bulan ini dengan aksi cepat: lunas, ingatkan via WhatsApp, ubah nominal, bebaskan. */
export function InvoiceList({
  invoices,
  month,
  academyName,
  canManage,
}: {
  invoices: InvoiceRow[];
  month: string;
  academyName: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<{ id: string; mode: "pay" | "more" | "amount" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function act(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(undefined);
    const r = await api<void>(`/invoices/${id}`, { method: "PATCH", body });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    setOpen(null);
    router.refresh();
  }

  return (
    <>
      {error ? (
        <div className="mb-3">
          <Alert tone="error">{error}</Alert>
        </div>
      ) : null}
      <ul className="grid gap-2">
        {invoices.map((i) => {
          const isOpen = open?.id === i.id;
          const reminder =
            i.status === "unpaid" && i.guardianPhone
              ? whatsappLink(
                  i.guardianPhone,
                  `Halo${i.guardianName ? ` ${i.guardianName}` : ""}, kami dari ${academyName} ingin mengingatkan iuran bulan ${monthLabel(month)} untuk ${i.fullName} sebesar ${rupiah(i.amount)}. Terima kasih.`,
                )
              : null;
          return (
            <li key={i.id} className="rounded-[1.5rem] bg-chalk p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{i.fullName}</span>
                  <span className="block truncate text-sm text-ink-soft">{i.teamNames || "Tanpa tim"}</span>
                </span>
                <span className="text-right">
                  <span className={`block font-extrabold ${i.status === "waived" ? "text-ink-soft line-through" : ""}`}>
                    {rupiah(i.amount)}
                  </span>
                  <span className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[i.status].tone}`}>
                    {STATUS[i.status].label}
                    {i.status === "paid" && i.method
                      ? `, ${PAYMENT_METHODS.find((m) => m.id === i.method)!.label.toLowerCase()}${i.paidOn ? ` ${dayLabel(i.paidOn).split(", ")[1]}` : ""}`
                      : ""}
                  </span>
                </span>
              </div>

              {canManage ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {i.status === "unpaid" ? (
                    <>
                      <Button size="sm" onClick={() => setOpen(isOpen && open.mode === "pay" ? null : { id: i.id, mode: "pay" })}>
                        Tandai lunas
                      </Button>
                      {reminder ? (
                        <a
                          href={reminder}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#e7f8ee] px-4 text-sm font-bold text-[#11733d] transition hover:bg-[#d6f2e1]"
                        >
                          <MessageCircle aria-hidden className="size-4" /> Ingatkan
                        </a>
                      ) : null}
                      <Button size="sm" variant="ghost" onClick={() => setOpen(isOpen && open.mode === "more" ? null : { id: i.id, mode: "more" })}>
                        Lainnya
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(i.id, { action: "unpay" })}>
                      {i.status === "paid" ? "Batalkan lunas" : "Tagih lagi"}
                    </Button>
                  )}
                </div>
              ) : null}

              {isOpen && open.mode === "pay" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-mist p-3">
                  <span className="text-sm font-bold text-ink-soft">Dibayar lewat</span>
                  {PAYMENT_METHODS.map((m) => (
                    <Button key={m.id} size="sm" variant="dark" disabled={busy} onClick={() => act(i.id, { action: "pay", method: m.id })}>
                      {m.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              {isOpen && open.mode === "more" ? (
                <div className="mt-3 flex flex-wrap gap-2 rounded-2xl bg-mist p-3">
                  <Button size="sm" variant="outline" onClick={() => setOpen({ id: i.id, mode: "amount" })}>
                    Ubah nominal
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => act(i.id, { action: "waive" })}>
                    Bebaskan bulan ini
                  </Button>
                </div>
              ) : null}
              {isOpen && open.mode === "amount" ? (
                <form
                  className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-mist p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(i.id, { action: "amount", amount: new FormData(e.currentTarget).get("amount") });
                  }}
                >
                  <label className="grid gap-1 text-sm font-bold">
                    Nominal baru
                    <input
                      name="amount"
                      inputMode="numeric"
                      defaultValue={i.amount}
                      autoFocus
                      className="h-10 w-40 rounded-xl border-2 border-line bg-chalk px-3 outline-none focus:border-pitch"
                    />
                  </label>
                  <Button size="sm" type="submit" variant="dark" disabled={busy}>
                    Simpan
                  </Button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
