import { OpenSessionInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { openSession } from "@/server/sessions";

export const POST = route(async (req) => ok({ id: await openSession(await venueContext(), await body(req, OpenSessionInput)) }, 201));
