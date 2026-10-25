import { academyContext } from "@/server/context";
import { noContent, route } from "@/server/http";
import { routeId } from "@/server/ids";
import { stopSchedule } from "@/server/schedule";

type Ctx = { params: Promise<{ id: string }> };

/** Menghentikan jadwal rutin mulai hari ini; riwayat sesi dan absensi tetap tersimpan. */
export const DELETE = route(async (_req, ctx: Ctx) => {
  await stopSchedule(await academyContext(), await routeId(ctx, "Jadwal"));
  return noContent();
});
