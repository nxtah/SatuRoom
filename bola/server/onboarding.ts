import "server-only";
import { isNull } from "drizzle-orm";
import { inAcademy, type AcademyContext } from "./context";
import { players, schedules, sessions, teams } from "./schema";

export interface OnboardingStep {
  id: "academy" | "team" | "player" | "schedule";
  title: string;
  done: boolean;
  href: string;
}

/** Langkah persiapan akademi; status dihitung dari data nyata, bukan dicentang manual. */
export function onboardingSteps(ctx: AcademyContext): Promise<OnboardingStep[]> {
  return inAcademy(ctx, async (tx) => {
    const [team] = await tx.select({ id: teams.id }).from(teams).where(isNull(teams.archivedAt)).limit(1);
    const [player] = await tx.select({ id: players.id }).from(players).limit(1);
    const [schedule] = await tx.select({ id: schedules.id }).from(schedules).limit(1);
    const [session] = schedule ? [schedule] : await tx.select({ id: sessions.id }).from(sessions).limit(1);
    return [
      { id: "academy", title: "Data akademi", done: true, href: "/pengaturan" },
      { id: "team", title: "Buat tim pertama", done: Boolean(team), href: "/tim/baru" },
      { id: "player", title: "Tambah pemain pertama", done: Boolean(player), href: "/pemain/baru" },
      { id: "schedule", title: "Atur jadwal latihan", done: Boolean(session), href: "/jadwal/rutin" },
    ];
  });
}
