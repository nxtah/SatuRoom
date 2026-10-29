import { AnnouncementInput } from "@/lib/schemas";
import { createAnnouncement, listAnnouncements } from "@/server/announcements";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";

export const GET = route(async () => ok({ announcements: await listAnnouncements(await academyContext()) }));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ id: await createAnnouncement(ctx, await body(req, AnnouncementInput)) }, 201);
});
