import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Daftar" };

export default async function DaftarPage() {
  if (await currentSession()) redirect("/");
  return <RegisterForm />;
}
