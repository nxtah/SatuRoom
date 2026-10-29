import type { Metadata } from "next";
import { Maskot } from "@/components/maskot";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Cek email" };

export default async function CekEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="rise text-center">
      <div className="pop mx-auto w-32">
        <Maskot />
      </div>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Cek email Anda</h1>
      <p className="mt-3 text-ink-soft">
        Kami mengirim link konfirmasi{email ? <> ke <strong className="text-ink">{email}</strong></> : null}. Buka
        link itu untuk mengaktifkan akun. Tidak ada di kotak masuk? Cek folder spam.
      </p>
      <ButtonLink href="/masuk" variant="outline" className="mt-8">
        Ke halaman masuk
      </ButtonLink>
    </div>
  );
}
