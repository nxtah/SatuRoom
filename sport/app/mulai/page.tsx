import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listMyAcademies } from "@/server/academy";
import { currentSession } from "@/server/context";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Siapkan akademi" };

export default async function MulaiPage({ searchParams }: { searchParams: Promise<{ baru?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const { baru } = await searchParams;
  // Onboarding pertama hanya untuk yang belum punya akademi; menambah akademi lain lewat ?baru=1.
  if (baru !== "1" && (await listMyAcademies(session.userId)).length > 0) redirect("/");
  return <Onboarding firstName={session.name.split(" ")[0] ?? session.name} another={baru === "1"} />;
}
