import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { addDays } from "@/lib/dates";
import { listBookings } from "@/server/bookings";
import { listMembers } from "@/server/members";
import { requirePage } from "@/server/routing";
import { listTables } from "@/server/tables";
import { getVenue } from "@/server/venue";
import { BookingBoard } from "./booking-board";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ tgl?: string }> }) {
  const ctx = await requirePage("bookings.manage");
  const venue = await getVenue(ctx);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: venue.timezone }).format(new Date());
  const { tgl } = await searchParams;
  const date = tgl && /^\d{4}-\d{2}-\d{2}$/.test(tgl) ? tgl : today;
  const [bookings, tables, requests] = await Promise.all([listBookings(ctx, date, date), listTables(ctx), listBookings(ctx, today, addDays(today, 60))]);
  return (
    <>
      <PageHeader title="Booking" subtitle="Pesanan meja dari telepon, WhatsApp, atau link booking." />
      <BookingBoard
        date={date}
        today={today}
        bookings={bookings}
        pending={requests.filter((b) => b.status === "requested")}
        tables={tables.filter((t) => !t.isMaintenance)}
        link={venue.settings.publicBooking ? venue.code : null}
        openTime={venue.settings.openTime}
      />
    </>
  );
}
