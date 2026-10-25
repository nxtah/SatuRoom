import { AttendanceInput } from "@/lib/schemas";
import { saveAttendance } from "@/server/attendance";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { routeId } from "@/server/ids";

type Ctx = { params: Promise<{ id: string }> };

/** Menyimpan (atau mengubah) status kehadiran pemain untuk sesi ini. */
export const PUT = route(async (req, ctx: Ctx) => {
  const id = await routeId(ctx, "Sesi");
  return ok(await saveAttendance(await academyContext(), id, await body(req, AttendanceInput)));
});
