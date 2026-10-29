import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Tile } from "@/components/tiles";
import { publicVenue } from "@/server/bookings";
import { BookingRequestForm } from "./request-form";

export const metadata: Metadata = { title: "Pesan meja", robots: { index: false, follow: false } };

export default async function PesanPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const venue = await publicVenue(code.toUpperCase());
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: venue?.timezone ?? "Asia/Jakarta" }).format(new Date());
  return (
    <div className="min-h-dvh bg-mist">
      <div className="felt px-5 py-5">
        <div className="mx-auto flex max-w-xl items-center justify-between"><Brand tone="white" /><div aria-hidden className="flex gap-1.5"><Tile face={{ kind: "glyph", text: "中" }} className="w-8 rotate-6" /><Tile face={{ kind: "glyph", text: "發", tone: "green" }} className="w-8 -rotate-3" /></div></div>
      </div>
      <main className="mx-auto max-w-xl px-5 py-8">
        {venue ? (
          <>
            <h1 className="text-3xl font-bold text-balance">Pesan meja di {venue.name}</h1>
            <p className="mt-2 text-ink-soft">{venue.city ? `${venue.city}. ` : ""}Buka {venue.openTime.slice(0, 5)}-{venue.closeTime.slice(0, 5)}. Ini permintaan: pengelola akan memilihkan meja dan mengonfirmasi lewat WhatsApp.</p>
            <div className="tile mt-6 p-6"><BookingRequestForm code={code.toUpperCase()} today={today} open={venue.openTime.slice(0, 5)} /></div>
          </>
        ) : (
          <div className="tile p-8 text-center"><h1 className="text-2xl font-bold">Link booking tidak aktif</h1><p className="mt-2 text-ink-soft">Tempat ini belum membuka booking online, atau linknya salah. Hubungi tempatnya langsung.</p></div>
        )}
      </main>
    </div>
  );
}
