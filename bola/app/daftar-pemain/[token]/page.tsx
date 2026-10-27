import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Ruru } from "@/components/ruru";
import { publicRegistrationAcademy } from "@/server/registrations";
import { PublicRegistrationForm } from "./public-form";

export const metadata: Metadata = {
  title: "Daftar jadi pemain",
  // Link ini dibagikan lewat pesan pribadi; tidak perlu muncul di pencarian.
  robots: { index: false, follow: false },
};

export default async function DaftarPemainPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const academy = await publicRegistrationAcademy(token);
  return (
    <div className="min-h-dvh bg-mist">
      <header className="px-5 py-5 sm:px-10">
        <Brand />
      </header>
      <main className="mx-auto w-full max-w-[560px] px-5 pb-16">
        {academy ? (
          <>
            <div className="rise flex items-end gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink-soft">Pendaftaran pemain baru</p>
                <h1 className="mt-1 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{academy}</h1>
              </div>
              <div className="w-24 shrink-0 sm:w-28">
                <Ruru pose="wave" costume="academy" />
              </div>
            </div>
            <p className="rise mt-3 text-ink-soft">
              Isi data calon pemain di bawah. Pihak akademi akan menghubungi orang tua atau wali lewat nomor HP yang Anda isi.
            </p>
            <PublicRegistrationForm token={token} academyName={academy} />
          </>
        ) : (
          <div className="rise mt-10 flex flex-col items-center rounded-[2rem] bg-chalk px-6 py-12 text-center">
            <div className="w-28">
              <Ruru pose="think" />
            </div>
            <h1 className="mt-4 text-2xl font-extrabold">Pendaftaran ini sudah ditutup</h1>
            <p className="mt-2 max-w-sm text-ink-soft">
              Link ini tidak berlaku lagi atau salah ketik. Minta link terbaru ke pihak akademi.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
