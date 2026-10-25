import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage() {
  if (await currentSession()) redirect("/");
  return <LoginForm />;
}
