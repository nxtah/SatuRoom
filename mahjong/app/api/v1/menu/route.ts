import { MenuInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createMenuItem, listMenu } from "@/server/menu";

export const GET = route(async () => ok({ items: await listMenu(await venueContext()) }));

export const POST = route(async (req) => ok({ id: await createMenuItem(await venueContext(), await body(req, MenuInput)) }, 201));
