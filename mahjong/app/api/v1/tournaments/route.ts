import { TournamentInput } from "@/lib/schemas";
import { venueContext } from "@/server/context";
import { body, ok, route } from "@/server/http";
import { createTournament } from "@/server/tournaments";

export const POST = route(async (req) => ok({ id: await createTournament(await venueContext(), await body(req, TournamentInput)) }, 201));
