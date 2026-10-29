import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { listMyVenues } from "@/server/venue";
import { Onboarding } from "./onboarding";

export const metadata: Metadata = { title: "Siapkan tempat" };

export default async function MulaiPage({ searchParams }: { searchParams: Promise<{ baru?: string }> }) {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const { baru } = await searchParams;
  // Onboarding pertama hanya untuk yang belum punya tempat; menambah tempat lain lewat ?baru=1.
  if (baru !== "1" && (await listMyVenues(session.userId)).length > 0) redirect("/");
  return <Onboarding firstName={session.name.split(" ")[0] ?? session.name} another={baru === "1"} />;
}
