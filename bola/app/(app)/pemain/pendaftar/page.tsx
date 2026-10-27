import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getAcademy } from "@/server/academy";
import { env } from "@/server/env";
import { getRegistrationLink, listRegistrations } from "@/server/registrations";
import { requireAcademyPage } from "@/server/routing";
import { listTeams } from "@/server/teams";
import { RegistrationDesk } from "./registration-desk";

export const metadata: Metadata = { title: "Pendaftar" };

export default async function PendaftarPage() {
  const ctx = await requireAcademyPage();
  // Data kontak wali ikut tampil di sini, jadi hanya peran yang boleh membaca kontak.
  if (!ctx.can("players.manage") || !ctx.can("guardians.read")) redirect("/pemain");
  const [link, pending, teams, academy] = await Promise.all([
    getRegistrationLink(ctx),
    listRegistrations(ctx),
    listTeams(ctx),
    getAcademy(ctx),
  ]);
  return (
    <>
      <PageHeader
        title="Pendaftar"
        back={{ href: "/pemain", label: "Pemain" }}
        subtitle="Bagikan link, calon pemain mengisi sendiri, lalu Anda yang memutuskan."
      />
      <RegistrationDesk
        origin={new URL(env().APP_URL).origin}
        link={link}
        pending={pending}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        academyName={academy.name}
      />
    </>
  );
}
