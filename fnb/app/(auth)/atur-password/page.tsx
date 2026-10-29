import type { Metadata } from "next";
import { ResetForm } from "./form";

export const metadata: Metadata = { title: "Password baru" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <>
    <p className="font-bold text-tomato">SatuRoom Rasa</p>
    <h1 className="mt-2 text-4xl font-extrabold">Password baru</h1>
    {token ? <ResetForm token={token} /> : <p className="mt-4 rounded-2xl bg-red-50 p-3 font-bold text-red-700">Link tidak lengkap. Minta link baru dari halaman Lupa password.</p>}
  </>;
}
