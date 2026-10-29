import { NoticeInput } from "@/lib/schemas";
import { requireSession } from "@/server/context";
import { body, noContent, route } from "@/server/http";
import { cancelNotice, submitNotice } from "@/server/player-account";

/** Pemain mengirim izin/sakit untuk satu sesi. */
export const PUT = route(async (req) => {
  const session = await requireSession();
  await submitNotice(session, await body(req, NoticeInput));
  return noContent();
});

export const DELETE = route(async (req) => {
  const session = await requireSession();
  const { sessionId } = await body(req, NoticeInput.pick({ sessionId: true }));
  await cancelNotice(session, sessionId);
  return noContent();
});
