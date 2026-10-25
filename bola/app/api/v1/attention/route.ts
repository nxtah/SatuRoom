import { needsAttention } from "@/server/attendance";
import { academyContext } from "@/server/context";
import { ok, route } from "@/server/http";

export const GET = route(async () => ok({ players: await needsAttention(await academyContext()) }));
