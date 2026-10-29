import { archiveAnnouncement } from "@/server/announcements";
import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";

export const POST = route(async (_req, ctx: { params: Promise<{ id: string }> }) => {
  const academy = await academyContext();
  await archiveAnnouncement(academy, await routeId(ctx, "Pengumuman"));
  return noContent();
});
