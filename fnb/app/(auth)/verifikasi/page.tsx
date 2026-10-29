import type { Metadata } from "next";
import { VerifyButton } from "./verify-button";

export const metadata: Metadata = { title: "Konfirmasi email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <>
    <p className="font-bold text-tomato">SatuRoom Rasa</p>
    <h1 className="mt-2 text-4xl font-extrabold">Konfirmasi email</h1>
    {token ? <VerifyButton token={token} /> : <p className="mt-4 rounded-2xl bg-red-50 p-3 font-bold text-red-700">Link tidak lengkap. Buka lagi link dari email Anda.</p>}
  </>;
}
