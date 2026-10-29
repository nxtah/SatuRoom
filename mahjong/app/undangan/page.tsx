import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { Maskot } from "@/components/maskot";
import { currentSession } from "@/server/context";
import { myInvitations, roleLabels } from "@/server/staff";
import { listMyVenues } from "@/server/venue";
import { AcceptButton } from "./accept-button";

export const metadata: Metadata = { title: "Undangan" };

export default async function UndanganPage() {
  const session = await currentSession();
  if (!session) redirect("/masuk?lanjut=undangan");
  const [invites, mine] = await Promise.all([myInvitations(session.userId), listMyVenues(session.userId)]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-8 sm:py-12">
      <Brand />
      <div className="rise mt-10 flex items-end gap-4">
        <div className="w-24 shrink-0">
          <Maskot />
        </div>
        <div className="min-w-0 pb-2">
          <h1 className="text-3xl leading-tight font-bold">{invites.length ? "Anda diundang" : "Tidak ada undangan"}</h1>
          <p className="mt-1 break-all text-ink-soft">{invites.length ? `Untuk ${session.email}` : `Belum ada undangan untuk ${session.email}.`}</p>
        </div>
      </div>

      {invites.length ? (
        <ul className="mt-6 grid gap-3">
          {invites.map((i) => (
            <li key={i.id} className="tile rise p-6">
              <p className="text-xl font-extrabold">{i.venueName}</p>
              <p className="mt-1 text-ink-soft">
                {i.invitedByName ? `${i.invitedByName} mengundang Anda sebagai ` : "Sebagai "}
                <span className="font-bold text-ink">{roleLabels(i.roles)}</span>.
              </p>
              <AcceptButton id={i.id} venueName={i.venueName} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="tile rise mt-6 p-6 text-ink-soft">
          Undangan dikirim ke email tertentu. Pastikan Anda masuk dengan email yang diundang, atau minta pemilik tempat mengirim ulang.
        </p>
      )}

      <p className="mt-8 text-center text-sm text-ink-soft">
        {mine.length ? (
          <Link href="/" className="font-bold text-ink underline-offset-4 hover:underline">Ke tempat saya</Link>
        ) : (
          <>
            Mau membuka tempat sendiri?{" "}
            <Link href="/mulai" className="font-bold text-ink underline-offset-4 hover:underline">Buat tempat</Link>
          </>
        )}
      </p>
    </main>
  );
}
