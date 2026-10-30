import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { currentSession } from "@/server/context";
import { googleConfig } from "@/server/google";
import { LoginForm } from "./form";

const NOTICE: Record<string, string> = {
  google: "Masuk dengan Google belum berhasil. Coba lagi, atau pakai email.",
  google_off: "Masuk dengan Google belum tersedia. Silakan pakai email.",
  google_conflict: "Email ini sudah tertaut ke akun Google lain.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ galat?: string; undangan?: string }> }) {
  if (await currentSession()) redirect("/");
  const { galat, undangan } = await searchParams;
  const google = googleConfig() !== null;
  return (
    <>
      <p className="font-bold text-tomato">SatuRoom Rasa</p>
      <h1 className="mt-2 text-4xl font-extrabold">Masuk</h1>
      <p className="mt-2 text-stone-600">Gunakan akun SatuRoom Anda.</p>
      {galat && NOTICE[galat] ? <p role="alert" className="mt-6 rounded-2xl bg-red-50 p-3 font-bold text-red-700">{NOTICE[galat]}</p> : null}
      {google ? (
        <div className="mt-8 grid gap-5">
          <GoogleButton />
          <OrDivider />
        </div>
      ) : null}
      <LoginForm next={undangan ? "/undangan" : "/"} />
      <p className="mt-8 text-center text-stone-600">
        Belum punya akun?{" "}
        <Link href={undangan ? "/daftar?undangan=1" : "/daftar"} className="font-bold text-kitchen underline decoration-saffron decoration-2 underline-offset-4">Daftar gratis</Link>
      </p>
    </>
  );
}
