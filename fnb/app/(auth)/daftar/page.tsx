import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleButton, OrDivider } from "@/components/google-button";
import { currentSession } from "@/server/context";
import { googleConfig } from "@/server/google";
import { RegisterForm } from "./form";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ email?: string; undangan?: string }> }) {
  const q = await searchParams;
  if (await currentSession()) redirect("/");
  const google = googleConfig() !== null;
  return (
    <>
      <p className="font-bold text-tomato">SatuRoom Rasa</p>
      <h1 className="mt-2 text-4xl font-extrabold">Buat akun</h1>
      <p className="mt-2 text-stone-600">Gratis. Setelah ini Anda langsung bisa menyiapkan bisnis.</p>
      {google ? (
        <div className="mt-8 grid gap-5">
          <GoogleButton label="Daftar dengan Google" />
          <OrDivider />
        </div>
      ) : null}
      <RegisterForm defaultEmail={q.email ?? ""} next={q.undangan ? "/undangan" : "/"} />
      <p className="mt-8 text-center text-stone-600">
        Sudah punya akun?{" "}
        <Link href={q.undangan ? "/masuk?undangan=1" : "/masuk"} className="font-bold text-kitchen underline decoration-saffron decoration-2 underline-offset-4">Masuk</Link>
      </p>
    </>
  );
}
