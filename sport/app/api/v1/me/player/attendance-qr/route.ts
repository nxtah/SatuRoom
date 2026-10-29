import { requireSession } from "@/server/context";
import { ok, route } from "@/server/http";
import { createAttendanceQr } from "@/server/player-account";

export const POST = route(async () => ok(await createAttendanceQr(await requireSession())));
