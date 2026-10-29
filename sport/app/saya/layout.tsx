import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { sportOf } from "@/lib/sports";
import { hasPlayerAccount, playerSport } from "@/server/player-account";
import { PlayerShell } from "./player-shell";

export default async function SayaLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  if (!(await hasPlayerAccount(session.userId))) redirect("/undangan");
  const sport = sportOf(await playerSport(session));
  return <PlayerShell accent={sport.accent}>{children}</PlayerShell>;
}
