import type { Metadata } from "next";
import { VerifyEmail } from "./verify-email";

export const metadata: Metadata = { title: "Konfirmasi email" };

export default async function VerifikasiPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerifyEmail token={token ?? ""} />;
}
