import { redirect } from "next/navigation";
import { currentSession } from "@/server/context";
import { sportOf } from "@/lib/sports";
import { childPicker, playerSport } from "@/server/player-account";
import { NotificationBell } from "@/components/notification-bell";
import { parentNotifications } from "@/server/parent-portal";
import { ChildSwitcher } from "./child-switcher";
import { PlayerShell } from "./player-shell";

export default async function SayaLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();
  if (!session) redirect("/masuk");
  const picker = await childPicker(session.userId);
  if (!picker.current) redirect("/undangan");
  const [sportId, notes] = await Promise.all([playerSport(session), parentNotifications(session)]);
  const sport = sportOf(sportId);
  return <PlayerShell accent={sport.accent} bell={<NotificationBell endpoint="/me/player/notifications" items={notes.items} unread={notes.unread} />} picker={picker.kids.length > 1 ? <ChildSwitcher kids={picker.kids} current={picker.current} /> : null}>{children}</PlayerShell>;
}
