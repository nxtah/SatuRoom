import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { googleConfig } from "@/server/google";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

/** Tujuan setelah masuk hanya dari daftar tetap, bukan URL bebas (mencegah open redirect). */
const NEXT = { undangan: "/undangan" } as const;

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ lanjut?: string; galat?: string }> }) {
  const { lanjut, galat } = await searchParams;
  const next = lanjut && lanjut in NEXT ? NEXT[lanjut as keyof typeof NEXT] : "/";
  if (await currentSession()) redirect(next);
  return <LoginForm next={next} lanjut={lanjut && lanjut in NEXT ? lanjut : undefined} google={googleConfig() !== null} notice={galat} />;
}
