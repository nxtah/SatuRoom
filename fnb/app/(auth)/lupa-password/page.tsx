import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./form";

export const metadata: Metadata = { title: "Lupa password" };

export default function ForgotPage() {
  return <>
    <p className="font-bold text-tomato">SatuRoom Rasa</p>
    <h1 className="mt-2 text-4xl font-extrabold">Lupa password</h1>
    <p className="mt-2 text-stone-600">Masukkan email akun Anda. Kami kirim link untuk membuat password baru.</p>
    <ForgotForm />
    <p className="mt-8 text-center"><Link href="/masuk" className="font-bold text-kitchen underline decoration-saffron decoration-2 underline-offset-4">Kembali ke halaman masuk</Link></p>
  </>;
}
