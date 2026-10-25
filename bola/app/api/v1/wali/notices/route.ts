import { NoticeInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { cancelNotice, submitNotice } from "@/server/guardian";
import { body, noContent, route } from "@/server/http";

/** Wali mengirim izin/sakit untuk satu sesi. */
export const PUT = route(async (req) => {
  const session = await requireSession();
  await submitNotice(session, await body(req, NoticeInput));
  return noContent();
});

export const DELETE = route(async (req) => {
  const session = await requireSession();
  const { playerId, sessionId } = await body(req, NoticeInput.pick({ playerId: true, sessionId: true }));
  await cancelNotice(session, playerId, sessionId);
  return noContent();
});
