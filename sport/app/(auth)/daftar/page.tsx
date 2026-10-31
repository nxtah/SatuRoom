import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { googleConfig } from "@/server/google";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default async function DaftarPage({ searchParams }: { searchParams: Promise<{ email?: string; undangan?: string }> }) {
  const q = await searchParams;
  const invited = Boolean(q.undangan);
  if (await currentSession()) redirect(invited ? "/undangan" : "/");
  return <RegisterForm google={googleConfig() !== null} defaultEmail={q.email ?? ""} invited={invited} />;
}
