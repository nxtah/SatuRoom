import { requireSession } from "@/server/context";
import { ok, route } from "@/server/http";
import { myInvitations } from "@/server/staff";

/** Undangan untuk email pengguna yang sedang masuk. */
export const GET = route(async () => ok({ invitations: await myInvitations((await requireSession()).userId) }));
