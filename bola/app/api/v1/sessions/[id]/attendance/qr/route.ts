import { AttendanceQrScanInput } from "@/lib/schemas";
import { scanAttendanceQr } from "@/server/attendance";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };
export const POST = route(async (req, ctx: Ctx) => ok(await scanAttendanceQr(await academyContext(), await routeId(ctx, "Sesi"), (await body(req, AttendanceQrScanInput)).token)));
