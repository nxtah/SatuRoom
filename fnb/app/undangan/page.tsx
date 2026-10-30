import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { ROLE_LABEL } from "@/lib/permissions";
import { currentSession } from "@/server/context";
import { myInvitations } from "@/server/invitations";
import { AcceptButton } from "./accept-button";

export const metadata: Metadata = { title: "Undangan" };

export default async function InvitationsPage() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const invites = await myInvitations(session.userId);
  return <main className="mx-auto flex min-h-dvh max-w-xl flex-col bg-plate px-4 py-8 sm:py-12">
    <Brand />
    <h1 className="mt-10 text-3xl font-extrabold">{invites.length ? "Anda diundang" : "Tidak ada undangan"}</h1>
    <p className="mt-1 break-all text-stone-600">{invites.length ? `Untuk ${session.email}` : `Belum ada undangan untuk ${session.email}.`}</p>
    {invites.length ? <ul className="mt-6 grid gap-3">{invites.map((i) => <li key={i.id} className="rounded-[2rem] bg-white p-6">
      <p className="text-xl font-extrabold">{i.businessName}</p>
      <p className="mt-1 text-stone-600">{i.invitedByName ? `${i.invitedByName} mengundang Anda sebagai ` : "Sebagai "}<span className="font-bold text-ink">{[...i.roles.map((r) => ROLE_LABEL[r]), ...i.customRoles].join(", ")}</span>.</p>
      <AcceptButton id={i.id} name={i.businessName} />
    </li>)}</ul> : <p className="mt-6 rounded-[2rem] bg-white p-6 text-stone-600">Undangan dikirim ke email tertentu dan baru terlihat setelah email itu dikonfirmasi. Baru daftar? Buka email Konfirmasi email SatuRoom Rasa, klik tombol konfirmasinya, lalu muat ulang halaman ini. Pastikan Anda masuk dengan email yang diundang, atau minta pemilik mengirim ulang.</p>}
    <p className="mt-8 text-center text-sm text-stone-600"><Link href="/" className="font-bold text-kitchen underline decoration-saffron decoration-2 underline-offset-4">Ke beranda</Link></p>
  </main>;
}
