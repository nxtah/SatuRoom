import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { playerHome } from "@/server/player-account";

export async function requirePlayerHome() {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const me = await playerHome(session);
  if (!me) redirect("/undangan");
  return me;
}
