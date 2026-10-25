import { ScheduleInput } from "@/lib/schemas";
import { academyContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createSchedule, listSchedules } from "@/server/schedule";

export const GET = route(async () => ok({ schedules: await listSchedules(await academyContext()) }));

export const POST = route(async (req) => {
  const ctx = await academyContext();
  return ok({ ids: await createSchedule(ctx, await body(req, ScheduleInput)) }, 201);
});
